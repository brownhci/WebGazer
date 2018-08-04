#!/usr/bin/env python
import logging
import os
import subprocess
import sys
import glob
import re

import time
import datetime
import pytz
import math

import base64
from binascii import a2b_base64
from decimal import Decimal

from itertools import chain

import tornado.web
import tornado.websocket
import tornado.httpserver
import tornado.ioloop
import tornado.log
import tornado.escape

import json, csv, urllib
import cv2
import numpy as np

# TODO
# - Check Aaron's timestamps
# - Fix screen cap write out

# Where are we putting the output?
outputPrefix = "../FramesDataset/"

# Video frame extraction parameters
frameExtractFormat = "frame_{:08d}.png"
frameOutFormat = "frame_{:08d}_{:08d}.png"

# CSV File names
csvTempName = "gazePredictions.csv"
csvDoneName = "gazePredictionsDone.csv"

# Participant characteristics file
pctFile = "20180317_participant_characteristics.csv"

# Options
writeCSV = True
onlyWritingVideos = True    # Only process videos where the participant is asked to write into a text field
writeScreenCapVideo = False
useAaronCircles = False

# Globals for current state of eye tracking
tobiiCurrentX = 0
tobiiCurrentY = 0
wgCurrentX = 0
wgCurrentY = 0


# Which participant are we on?
participantDirList = []
participantPos = -1
participant = []


##################################################################
# Screen properties
#
# WARNING: MAGIC NUMBERS
# PC clientX = 0 screen position
pcDocumentStartX = 0
pcDocumentStartY = 66
pcDocumentEndXNoScrollbar = 1902 # not including scroll bar
pcDocumentEndX = 1919 # not including scroll bar
pcDocumentEndY = 1110 # not including scroll bar

# Laptop clientX = 0 screen position
laptopDocumentStartX = 0
laptopDocumentStartY = 97
laptopDocumentEndXNoScrollbar = 1439 # not including scroll bar
laptopDocumentEndX = 1439 # not including scroll bar
laptopDocumentEndY = 775 # not including scroll bar

# In pixels
chromeDownloadBarHeight = 52


##################################################################
# CSV header object field names
clmPosKeys = ['clmPos_%04d' % i for i in range(0, 142)]
eyeFeaturesKeys = ['eyeFeatures_%04d' % i for i in range(0, 120)]
fieldnames = (['participant','frameImageFile','frameTimeEpoch','frameNum','mouseMoveX','mouseMoveY','mouseClickX','mouseClickY','keyPressed','keyPressedX','keyPressedY',
               'tobiiLeftScreenGazeX','tobiiLeftScreenGazeY','tobiiRightScreenGazeX','tobiiRightScreenGazeY','webGazerX','webGazerY'])
fieldnames.extend( clmPosKeys )
fieldnames.extend( eyeFeaturesKeys )


##################################################################
# Classes for data storage
#
class TobiiData:
    timestamp = 0
    rightEyeValid = False
    leftEyeValid = False
    rightScreenGazeX = -math.inf
    rightScreenGazeY = -math.inf
    leftScreenGazeX = -math.inf
    leftScreenGazeY = -math.inf

    def __init__(self, timestamp, rev, lev, rsgx, rsgy, lsgx, lsgy ):
        self.timestamp = timestamp
        self.rightEyeValid = rev
        self.leftEyeValid = lev
        self.rightScreenGazeX = rsgx
        self.rightScreenGazeY = rsgy
        self.leftScreenGazeX = lsgx
        self.leftScreenGazeY = lsgy

    def __str__(self):
        return "[TobiiData] Timestamp: " + str(self.timestamp) + "  RightEyeValid: " + str(self.rightEyeValid) + "  REX: " + str(self.rightScreenGazeX) + "  REY: " + str(self.rightScreenGazeY)

class ParticipantVideo:
    filename = []
    startTimestamp = -1
    stopTimestamp = -1

    frameFilesList = []
    frameFilesPos = -1

    def __init__(self, filename, startTimestamp):
        self.filename = filename
        self.startTimestamp = startTimestamp
    
    def __str__(self):
        return "[ParticipantVideo] Timestamp: " + str(self.startTimestamp) + " Filename: " + str(self.filename)

class ParticipantData:
    directory = ""

    videos = []
    videosPos = -1

    startTimestamp = -1
    screenWidthPixels = -1
    screenHeightPixels = -1

    inputLogFile = ""
    wgWindowX = -1
    wgWindowY = -1
    wgWindowInnerWidth = -1
    wgWindowInnerHeight = -1
    wgWindowOuterWidth = -1
    wgWindowOuterHeight = -1

    touchTypist = ""            # Equals either 'Yes' or 'No'
    pcOrLaptop = ""             # Equals either 'Laptop' or 'PC'

    tobiiLogFile = ""
    tobiiList = []
    tobiiListPos = 0

    screencapFile = ""
    screencap = None
    screencapOut = None
    screencapStartTime = 0
    screencapFrameWidth = 0
    screencapFrameHeight = 0
    screencapFrameRate = 0
    prevMSECIntoVideo = -1

    def __init__(self, directory):
        self.directory = directory
        
    def __str__(self):
        return "[ParticipantData] Directory: " + self.directory + "  PC or Laptop: " + str(self.pcOrLaptop)

    def loadParticipantData(self):
        global pctFile, writeScreenCapVideo

        ########################
        # Load participant characteristics as technical parts
        with open( pctFile ) as f:
            readCSV = csv.reader(f, delimiter=',')
            for row in readCSV:
                if row[0] == self.directory:
                    self.screenWidthPixels = int(row[4])
                    self.screenHeightPixels = int(row[5])
                    self.pcOrLaptop = str(row[3])  # Equals either 'Laptop' or 'PC'
                    self.touchTypist = str(row[18])  # Equals either 'Yes' or 'No'
                    self.screencapStartTime = int(row[9])  # 20180316 JT Note: the value in the .csv is currently inaccurate or incomplete
                    break

        ########################
        # WebGazer event log
        # *dot_test_instructions.webm is the first video file.
        webMFile = glob.glob( self.directory + '/' + '*dot_test_instructions.webm' )
        # Split the video name into its pieces
        f = os.path.split( webMFile[0] )[1]
        # Find the first part of the video filename, which is the timestamp as a string
        self.startTimestamp = int(f[0:f.find('_')])
        print( self.directory )
        self.inputLogFile = self.directory + "/" + str(self.startTimestamp) + ".json"

        # Load WebGazer browser window parameters
        with open( self.inputLogFile ) as f:
            inputLog = json.load( f )

        for l in inputLog:
            if l.get('windowX') != None:
                self.wgWindowX = int(l['windowX'])
                self.wgWindowY = int(l['windowY'])
                self.wgWindowInnerWidth = int(l['windowInnerWidth'])
                self.wgWindowInnerHeight = int(l['windowInnerHeight'])
                self.wgWindowOuterWidth = int(l['windowOuterWidth'])
                self.wgWindowOuterHeight = int(l['windowOuterHeight'])
                break

        # Find all video recordings, with start times
        self.videos = []
        self.videosPos = -1

        for l in inputLog:
            if l.get("type") == "recording start":
                fn = l.get("sessionString")
                fn = fn.replace('/', '-') + '.webm'
                starttime = l.get("epoch")
                pv = ParticipantVideo( fn, starttime )
                self.videos.append( pv )


        ################################
        # Filter video names
        #
        # Oftentimes, we want to only process a subset of the videos per participant.
        # We can remove videos from self.videos here to accomplish this.
        #
        # E.G., if we only wanted video files to do with _writing and the dot tests, then
        if onlyWritingVideos:
            self.videos = [x for x in self.videos if (x.filename.find('_writing') >= 0 or x.filename.find('dot_test.') >= 0 or x.filename.find( 'dot_test_final.' ) >= 0)]
        
        ################################
        # Read in JSON output from Tobii
        self.tobiiLogFile = self.directory + '/' + self.directory + ".txt"
        self.tobiiList = []
        self.tobiiListPos = 0
        # Each line is a JSON object, so let's read the file line by line
        with open( self.tobiiLogFile, 'r' ) as f:
            for line in f:
                l = json.loads(line, parse_float=Decimal)
                
                rsgx = float(l['right_gaze_point_on_display_area'][0])
                rsgy = float(l['right_gaze_point_on_display_area'][1])
                lsgx = float(l['left_gaze_point_on_display_area'][0])
                lsgy = float(l['left_gaze_point_on_display_area'][1])
                timestamp = round( l['true_time'] * 1000 )
                rpv = l['right_pupil_validity']
                lpv = l['left_pupil_validity']
                td = TobiiData( timestamp, rpv, lpv, rsgx, rsgy, lsgx, lsgy )
                self.tobiiList.append( td )


        ################################
        # Define screen capture file
        if self.pcOrLaptop == "Laptop":
            self.screencapFile = self.directory + "/" + self.directory + ".mov"
        elif self.pcOrLaptop == "PC":
            self.screencapFile = self.directory + "/" + self.directory + ".flv"
        else:
            print( "Not PC nor Laptop! ERROR ERROR" )
            writeScreenCapVideo = False
            return

        # If we're going to write out a screen capture video, then load it
        if writeScreenCapVideo:
            openScreenCapOutVideo( self )
            loadScreenCapVideo( self )

##################################################################
# Image/video operations
#
def readImageRGBA( filename ):
    # Add an alpha channel, because JavaScript ImageData object requires rgba, and I think it'll be quicker to do it in numpy
    b_channel, g_channel, r_channel = cv2.split( cv2.imread( filename ) )
    a_channel = np.ones(b_channel.shape, dtype=b_channel.dtype) * 255
    return cv2.merge((r_channel, g_channel, b_channel, a_channel))

# p = participant
def loadScreenCapVideo( p ):
    global writeScreenCapVideo, useAaronCircles

    ##########################################################################
    # Load new screen capture video
    if writeScreenCapVideo:
        print( "    Loading screen capture video..." )
        # Check if we're already open; if so, close.
        if p.screencap != None:
            p.screencap.release()

        # Open screen capture file
        p.screencap = cv2.VideoCapture( p.screencapFile )
        p.screencapFrameRate = p.screencap.get(cv2.CAP_PROP_FPS)
        p.screencapFrameWidth = p.screencap.get(cv2.CAP_PROP_FRAME_WIDTH)
        p.screencapFrameHeight = p.screencap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        
        # JT HACK
        # For some reason, the 'Laptop' screen recording as twice as large in each dimension as it needs to be
        if p.pcOrLaptop == "Laptop":
            p.screencapFrameWidth = p.screencapFrameWidth/2
            p.screencapFrameHeight = p.screencapFrameHeight/2
        print( "    Frame details: " + str(p.screencapFrameWidth) + " "  + str(p.screencapFrameHeight) + " " + str(p.screencapFrameRate) + " (" + str(int(p.screencapFrameRate)) + ")" )

        # Overwrite timestamp with Aaron's estimate from circle!
        # Synchronization video file
        circleSynchroCSV = p.directory + '/' + p.directory + "_circles.csv"

        if useAaronCircles and os.path.isfile( circleSynchroCSV ):
            print( "    Using Aaron's circle measurement OCR attempt..." )

            # This file contains _local_ timestamps written in EST
            circTime = 0
            circFrame = 0
            with open( circleSynchroCSV ) as f:
                cod = csv.reader(f, delimiter=',')
                for i, row in enumerate(cod):
                    if i == 1:
                        circTime = row[2]
                        circFrame = row[3]
                        break

            print( "    Circle times + frame: " + str(circTime) + " " + str(circFrame) )
            # Looks like this: Mon 04:20:14.835098 PM
            cft = datetime.datetime.strptime(circTime, "%a %I:%M:%S.%f %p")
            cft = cft.replace( year=ct.year, month=ct.month, day=ct.day )
            tz = pytz.timezone('US/Eastern')
            cft = tz.normalize(tz.localize(cft)).astimezone(pytz.utc)
            print( cft.timestamp() )
            # Now add on the date of the experiment
            #ctDay = datetime.datetime( ct.year, ct.month, ct.day )
            print( "    Subtracting: " + str((float(circFrame) * (1000.0/p.screencapFrameRate))))
            p.screencapStartTime = (cft.timestamp() * 1000) - int((float(circFrame) * (1000.0/p.screencapFrameRate)))

        print( "    ScreenCapVideo Start Time: " + str(p.screencapStartTime) )
    #
    # End screen cap video
    ##########################################################################


# p = participant
def writeScreenCapOutputFrames( p, frameTimeEpoch ):
    global tobiiCurrentX, tobiiCurrentY, wgCurrentX, wgCurrentY

    ###########################################################################################################
    # Display the corresponding video frame
    msecIntoVid = frameTimeEpoch - p.screencapStartTime
    
    # Either we have an initial seek (expensive)
    if p.prevMSECIntoVideo == -1:
        # print( "MSEC into video: " + str(msecIntoVid) )
        p.screencap.set(cv2.CAP_PROP_POS_MSEC, msecIntoVid)
        ret, image = p.screencap.read()
        # JHT HACK
        # For some reason, the 'Laptop' screen recording is twice as large as it needs to be
        if p.pcOrLaptop == "Laptop":
            image = cv2.resize( image, (int(p.screencapFrameWidth),int(p.screencapFrameHeight) ) )
        prevMSECIntoVideo = msecIntoVid

        # Write the frame
        if ret:
            center = ( int(p.screencapFrameWidth * float(tobiiCurrentX)), int(p.screencapFrameHeight * float(tobiiCurrentY)) )
            image = cv2.circle(image, center, 10, (0,255,0), -1)
            center = ( int(p.screencapFrameWidth * float(wgCurrentX)), int(p.screencapFrameHeight * float(wgCurrentY)) )
            image = cv2.circle(image, center, 10, (0,0,255), -1)
            p.screencapOut.write(image)
    
    # Or, we just play the video until we hit the right time (cheap)
    else:
        # Decode frames until we're at the right place
        while msecIntoVid > p.screencap.get(cv2.CAP_PROP_POS_MSEC) + int(1000/p.screencap.get(cv2.CAP_PROP_FPS)):
            print( "    Writing catchup frames..." + str(msecIntoVid) + " " + str(p.screencap.get(cv2.CAP_PROP_POS_MSEC)) )
            ret, image = p.screencap.read()
            if p.pcOrLaptop == "Laptop":
                image = cv2.resize( image, (int(p.screencapFrameWidth),int(p.screencapFrameHeight) ) )

            if ret:
                center = ( int(p.screencapFrameWidth * float(tobiiCurrentX)), int(p.screencapFrameHeight * float(tobiiCurrentY)) )
                image = cv2.circle(image, center, 10, (0,255,0), -1)
                center = ( int(p.screencapFrameWidth * float(wgCurrentX)), int(p.screencapFrameHeight * float(wgCurrentY)) )
                image = cv2.circle(image, center, 10, (0,0,255), -1)
                p.screencapOut.write(image)

    # End screen cap video out
    ###########################################################################################################


def openScreenCapOutVideo( p ):

    # Make output video on screen capture
    print( "    Creating screen capture video output..." )
    # cv2.VideoWriter_fourcc('H','2','6','4') - if you can build opencv correctly
    p.screencapOut = cv2.VideoWriter( p.directory + "/" + "screenCapOut_" + p.videos[p.videosPos].filename + ".avi", cv2.VideoWriter_fourcc('M','J','P','G'), int( p.screencapFrameRate ), (int(p.screencapFrameWidth), int(p.screencapFrameHeight)) )
    p.prevMSECIntoVideo = -1


def closeScreenCapOutVideo( p ):

    print( "    Closing screen capture video output..." )
    # Save out the screen capture output
    if p.screencapOut != None:
        p.screencapOut.release()


###########################################################################################################
# Messages to send over WebSockets
#
def sendParticipantInfo( wsh, participant ):

    # Tell the connecting socket about the participant
    # Screen coordinate data
    if participant.pcOrLaptop == "PC":
        docStartX = pcDocumentStartX
        docStartY = pcDocumentStartY
    else:
        docStartX = laptopDocumentStartX
        docStartY = laptopDocumentStartY

    parcel = ({ 'msgID': "0",
                'screenWidthPixels': str(participant.screenWidthPixels), 
                'screenHeightPixels': str(participant.screenHeightPixels), 
                'docStartX': str(docStartX),
                'docStartY': str(docStartY),
                'touchTypist': str(participant.touchTypist),
                'screencapStartTime': str(participant.screencapStartTime),
                'participantScreenCapFile': str(participant.screencapFile),
                'participantInputLogFile': str(participant.inputLogFile)})

    wsh.write_message( tornado.escape.json_encode( parcel ) )

def sendVideoFrame( wsh, fn, pv ):
    global tobiiCurrentX, tobiiCurrentY

    # Send the video frame, with the timestamp first
    # Reminder: "frame_{:08d}_{:08d}.png"
    frameNum = fn[len(fn)-21:len(fn)-13]
    timestamp = fn[len(fn)-12:len(fn)-4]

    parcel = ({'msgID': "2",
               'videoFilename': pv.filename,
               'frameNum': str(frameNum),
               'frameNumTotal': str(len(pv.frameFilesList)),
               'frameTimeEpoch': str(int(timestamp) + pv.startTimestamp),
               'frameTimeIntoVideoMS': str(timestamp), 
               'tobiiX': "{:+.4f}".format(tobiiCurrentX),
               'tobiiY': "{:+.4f}".format(tobiiCurrentY)})
    wsh.write_message( tornado.escape.json_encode(parcel) )
    wsh.write_message( readImageRGBA( fn ).tobytes(), binary=True )

def sendVideoEnd( wsh ):
    global participant

    # Progress video if not at end of video list for participant
    if participant.videosPos+1 >= len(participant.videos):
        # New participant!
        newParticipant( wsh )

    else:
        # Regular 'video end' message; will trigger return of {'msgID': "1"}
        parcel = {'msgID': "4"}
        wsh.write_message( tornado.escape.json_encode(parcel) )

######################################################################################
# Processors for messages

# p = participant
def writeDataToCSV( p, msg ):
    global tobiiCurrentX, tobiiCurrentY, wgCurrentX, wgCurrentY

    ###########################################################################################################
    # Store current WebGazer prediction from browser
    wgCurrentX = float( msg["webGazerX"] )
    wgCurrentY = float( msg["webGazerY"] )


    ###########################################################################################################
    # Find the closest Tobii timestamp to our current video timestamp
    #
    # As time only goes forwards, tobiiListPos is a counter which persists over GET requests.
    # The videos arrive in non-chronological order, however, so we have to reset tobiiListPos on each new video
    frameTimeEpoch = int( msg["frameTimeEpoch"] )
    while p.tobiiListPos < len(p.tobiiList)-2 and frameTimeEpoch - p.tobiiList[p.tobiiListPos].timestamp > 0:
        p.tobiiListPos = p.tobiiListPos + 1

    if p.tobiiListPos == len(p.tobiiList):
        # We've come to the end of the list and there are no more events...
        print( "Error: at end of Tobii event list; no matching timestamp" )
        tobiiCurrentX = -1
        tobiiCurrentY = -1
    else:
        # TobiiList
        diffCurr = frameTimeEpoch - p.tobiiList[p.tobiiListPos].timestamp
        diffNext = frameTimeEpoch - p.tobiiList[p.tobiiListPos+1].timestamp

        # Pick the one which is closest in time
        if abs(diffCurr) < abs(diffNext):
            td = p.tobiiList[p.tobiiListPos]
        else:
            td = p.tobiiList[p.tobiiListPos+1]

        # Check validity for return value
        if td.rightEyeValid == 1 and td.leftEyeValid == 1:
            tobiiCurrentX = (td.leftScreenGazeX + td.rightScreenGazeX) / 2.0
            tobiiCurrentY = (td.leftScreenGazeY + td.rightScreenGazeY) / 2.0
        elif td.rightEyeValid == 1 and td.leftEyeValid == 0:
            tobiiCurrentX = td.rightScreenGazeX
            tobiiCurrentY = td.rightScreenGazeY
        elif td.rightEyeValid == 0 and td.leftEyeValid == 1:
            tobiiCurrentX = td.leftScreenGazeX
            tobiiCurrentY = td.leftScreenGazeY
        else:
            # Neither is valid, so we could either leave it as the previous case,
            # which involves doing nothing,
            # or set it to -1.
            tobiiCurrentX = -1
            tobiiCurrentY = -1

    ###################################################
    # Work out what to write out to CSV
    out = msg
    del out['msgID']
    out['participant'] = p.directory
    pv = p.videos[p.videosPos]
    out['frameImageFile'] = pv.frameFilesList[ pv.frameFilesPos ]
    
    out["tobiiLeftScreenGazeX"] = td.leftScreenGazeX
    out["tobiiLeftScreenGazeY"] = td.leftScreenGazeY
    out["tobiiRightScreenGazeX"] = td.rightScreenGazeX
    out["tobiiRightScreenGazeY"] = td.rightScreenGazeY

    # Turn clmPos and eyeFeatures into per-column values
    clmPosDict = dict(zip( clmPosKeys, list(chain.from_iterable( out["clmPos"] )) ) )
    eyeFeaturesDict = dict(zip( eyeFeaturesKeys, out["eyeFeatures"] ))
    out.update( clmPosDict )
    out.update( eyeFeaturesDict )
    del out['clmPos']
    del out['eyeFeatures']

    if writeCSV:

        # A reminder of what the desired field name outputs are.
        # fieldnames = (['participant','frameImageFile','frameTimeEpoch','frameNum','mouseMoveX','mouseMoveY','mouseClickX','mouseClickY','keyPressed','keyPressedX','keyPressedY',
        #                'tobiiLeftScreenGazeX','tobiiLeftScreenGazeY','tobiiRightScreenGazeX','tobiiRightScreenGazeY','webGazerX','webGazerY','clmPos','eyeFeatures'])

        # Target dir for output
        outDir = outputPrefix + '/' + participant.directory + '/' + participant.videos[participant.videosPos].filename + "_frames" + '/'
        # Target gaze predictions csv
        gpCSV = outDir + '/' + csvTempName

        with open( gpCSV, 'a', newline='' ) as f:
            # Note no quotes between clmTracker and eyeFeatures
            # f.write( "\"" + participant.directory + "\",\"" + fname + "\",\"" + str(frameTimeEpoch) + "\",\"" + str(frameNum) + "\",\"" + str(mouseMoveX) + "\",\"" + str(mouseMoveY) + "\",\"" + str(mouseClickX) + "\",\"" + str(mouseClickY) + "\",\"" + keyPressed + "\",\"" + str(keyPressedX) + "\",\"" + str(keyPressedY) + "\",\"" + str(td.leftScreenGazeX) + "\",\"" + str(td.leftScreenGazeY) + "\",\"" + str(td.rightScreenGazeX) + "\",\"" + str(td.rightScreenGazeY) + "\",\"" + str(wgCurrentX) + "\",\"" + str(wgCurrentY) + "\"," + str(clmPos) + "," + str(eyeFeatures) + "\n")
            writer = csv.DictWriter(f, fieldnames=fieldnames,delimiter=',',quoting=csv.QUOTE_ALL)
            writer.writerow( out )

    return frameTimeEpoch
################################################################################################

def newParticipant( wsh ):
    global participant, participantPos, participantDirList

    # TODO James doesn't understand python. How do I nuke the 'participant' global?!
    participant = None
    
    participantPos = participantPos + 1

    # Check we're not at the last participant
    if participantPos >= len(participantDirList):
        print( "All participants completed." )
        exit()
    else:
        # Load the participant data
        participant = ParticipantData( participantDirList[participantPos] )
        participant.loadParticipantData()
        sendParticipantInfo( wsh, participant )


class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def open(self):
        global participantPos

        participantPos = -1
        newParticipant( self )

 
    def on_message(self, message):
        global participantDirList, participant, participantPos, onlyWritingVideos
        
        #######################################################################################
        # Video requested from client
        #
        msg = tornado.escape.json_decode( message )
        if msg['msgID'] == '1':
            
            #######################################
            # Extract video frames and find timestamps
            # TODO: Refactor, but be careful. Prickly code
            #
            participant.videosPos = participant.videosPos + 1
            pv = participant.videos[participant.videosPos]
            video = participant.directory + '/' + pv.filename
            print( "Processing video: " + video )

            #
            # Make dir for output video frames
            outDir = outputPrefix + '/' + video + "_frames" + '/'
            if not os.path.isdir( outDir ):
                os.makedirs( outDir )


            # We may have already processed this video...
            gpCSVDone = outDir + '/' + csvDoneName
            gpCSV = outDir + '/' + csvTempName
            if os.path.isfile( gpCSVDone ):
                print( "    " + csvDoneName + " already exists and completed; moving on to next video...")
                sendVideoEnd( self )
                return
            elif os.path.isfile( gpCSV ):
                print( "    " + csvTempName + " exists but does not have an entry for each file; deleting csv and starting this video again...")
                os.remove(gpCSV)

                # Write the header for the new gazePredictions.csv file
                if writeCSV:
                    with open( gpCSV, 'w', newline='' ) as csvfile:
                        writer = csv.DictWriter(csvfile, fieldnames=fieldnames,delimiter=',',quoting=csv.QUOTE_ALL)
                        writer.writeheader()            

            # If we're not done, we need to extract the video frames (using ffmpeg).
            # If this is already done, we write 'framesExtracted.txt'
            #
            framesDoneFile = outDir + '/' + "framesExtracted.txt"
            if not os.path.isfile( framesDoneFile ):
                print( "    Extracting video frames (might take a few minutes)... " + str(video) )
                completedProcess = subprocess.run('ffmpeg -i "./' + video + '" -vf showinfo "' + outDir + 'frame_%08d.png"', stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, shell=True)

                nFrames = len(glob.glob( outDir + '*.png' ))
                if nFrames == 0:
                    print( "    Error extracting video frames! Moving on to next video..." )
                    sendVideoEnd( self )
                    return

                # Collect the timestamps of the video frames
                allPts = np.ones(nFrames, dtype=np.int) * -1
                ptsTimebase = -1
                framerate = -1
                lines = completedProcess.stderr.splitlines()
                for l in lines:
                    if l.startswith( "[Parsed_showinfo_0 @" ):
                        timebase = l.find( "config in time_base:" )
                        fr = l.find( ", frame_rate:" )
                        nStart = l.find( "n:" )
                        ptsStart = l.find( "pts:" )
                        pts_timeStart = l.find( "pts_time:" )
                        if nStart >= 0 and ptsStart >= 0:
                            frameNum = int(l[nStart+2:ptsStart-1].strip())
                            pts = int(l[ptsStart+4:pts_timeStart].strip())
                            allPts[frameNum] = pts
                        elif timebase >= 0:
                            ptsTimebase = l[timebase+20:fr].strip()
                            framerate = l[fr+13:].strip()
                            sl = framerate.find("/")
                            if sl > 0:
                                frPre = framerate[0:sl]
                                frPost = framerate[sl+1:]
                                framerate = float(frPre) / float(frPost)
                            else:
                                framerate = float(framerate)

                            if ptsTimebase != "1/1000":
                                print( "ERROR ERROR Timebase in webm is not in milliseconds" )
                    # if l.startswith( "frame=" ):
                        # This is written out at the end of the file, and looks like this:
                        # frame=  454 fps= 51 q=24.8 Lsize=N/A time=00:00:15.13 bitrate=N/A dup=3 drop=1 speed=1.71x -  refers to decoding 

                # Some of the presentation times (pts) will not have been filled in, and will be -1s
                # Let's just assume the framerate is good (yea right) and add on the frame time to the last good
                prev = 0
                for i in range(0, nFrames):
                    if allPts[i] == -1:
                        allPts[i] = prev + int(1000/framerate)
                    prev = allPts[i]
                
                # TODO Write out this data to a pts file?

                # Rename the files based on their frame number and timestamp
                for i in range(0, nFrames):
                    inputFile = outDir + frameExtractFormat.format(i+1) # Catch that the output framenumbers from extraction start from 1 and not 0
                    outputFile = outDir + frameOutFormat.format(i, allPts[i])
                    os.rename( inputFile, outputFile )
                
                with open( framesDoneFile, 'w' ) as f:
                    f.write( "Done." )


            # Populate list with video frames
            pv.frameFilesList = sorted(glob.glob( outDir + '*.png' ))
            pv.frameFilesPos = 0
            

            ########################################
            # Send the first video frame + timestamp
            #
            sendVideoFrame( self, pv.frameFilesList[pv.frameFilesPos], pv )
        # 
        # End NEW VIDEO
        #######################################################################################
        

        #######################################################################################
        # Feedback from CLIENT which contains the webgazer + interaction metadata we need...
        # 
        elif msg['msgID'] == '3':
            # Parse, manipulate the data and write to CSV
            frameTimeEpoch = writeDataToCSV( participant, msg )

            if writeScreenCapVideo:
                writeScreenCapOutputFrames( participant, frameTimeEpoch )

            ##################################
            # Send the next frame of the video
            pv = participant.videos[participant.videosPos]
            pv.frameFilesPos = pv.frameFilesPos + 1
            
            # If the video frame is the last available video frame, send a message to this effect
            if pv.frameFilesPos >= len(pv.frameFilesList):

                if writeScreenCapVideo:
                    closeScreenCapOutVideo( participant )

                outDir = outputPrefix + '/' + participant.directory + '/' + pv.filename + "_frames" + '/'
                gpCSV = outDir + '/' + csvTempName
                gpCSVDone = outDir + '/' + csvDoneName
                if os.path.isfile( gpCSV ):
                    os.rename( gpCSV, gpCSVDone )

                sendVideoEnd( self )

            else:
                sendVideoFrame( self, pv.frameFilesList[pv.frameFilesPos], pv )


    def on_close(self):
        pass


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r'/websocket', WebSocketHandler),
            (r'/(.*)', tornado.web.StaticFileHandler, {'path': '.', 'default_filename': ''}),
        ]
 
        settings = {
            'template_path': 'templates'
        }
        tornado.web.Application.__init__(self, handlers, **settings)


def main():
    global participantDirList

    ###########################################################################################################
    # Enumerate all P_ subdirectories if not yet done
    regex = re.compile('P_[0-9][0-9]')

    participantDirList = []
    for root, dirs, files in os.walk('.'):
        for d in dirs:
            if regex.match(d):
               participantDirList.append(d)

    participantDirList = sorted( participantDirList )

    # NOTE: This would be the point to filter any participants from the processing


    ###########################################################################################################
    # Setup webserver
    #
    listen_address = ''
    listen_port = 8000
    try:
        if len(sys.argv) == 2:
            listen_port = int(sys.argv[1])
        elif len(sys.argv) == 3:
            listen_address = sys.argv[1]
            listen_port = int(sys.argv[2])
        assert 0 <= listen_port <= 65535
    except (AssertionError, ValueError):
        raise ValueError('Port must be a number between 0 and 65535')

    args = sys.argv
    args.append("--log_file_prefix=myapp.log")
    tornado.log.enable_pretty_logging()
    tornado.options.parse_command_line(args)
    
    ws_app = Application()
    http_server = tornado.httpserver.HTTPServer(ws_app)
    http_server.listen(listen_port)

    # Logging
    logging.info('Listening on %s:%s' % (listen_address or '[::]' if ':' not in listen_address else '[%s]' % listen_address, listen_port))
    # [James]
    # Uncomment these lines to suppress normal webserver output
    #logging.getLogger('tornado.access').disabled = True
    #logging.getLogger('tornado.application').disabled = True
    #logging.getLogger('tornado.general').disabled = True

    # Message
    print( "WebGazer ETRA2018 Dataset Extractor server started; please open http://localhost:8000/webgazerExtractClient.html" )

    #################################
    # Start webserver
    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    main()
