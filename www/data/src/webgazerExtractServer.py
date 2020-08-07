#!/usr/bin/env python
import logging
import os
import subprocess
import sys
import glob
import re

import time
import datetime
import math

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
import numpy as np

from videoProcessing import readImageRGBA,loadScreenCapVideo,writeScreenCapOutputFrames,openScreenCapOutVideo,\
    closeScreenCapOutVideo,sendVideoFrame,sendVideoEnd
import global_variables
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
pctFile = "participant_characteristics.csv"
writeCSV = True



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
fmPosKeys = ['fmPos_%04d' % i for i in range(0, 468)]
eyeFeaturesKeys = ['eyeFeatures_%04d' % i for i in range(0, 120)]
fieldnames = (['participant','frameImageFile','frameTimeEpoch','frameNum','mouseMoveX','mouseMoveY',
               'mouseClickX','mouseClickY','keyPressed','keyPressedX','keyPressedY',
               'tobiiLeftScreenGazeX','tobiiLeftScreenGazeY','tobiiRightScreenGazeX','tobiiRightScreenGazeY',
               'webGazerX','webGazerY','error','errorPix'])
fieldnames.extend( fmPosKeys )
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
        if global_variables.onlyWritingVideos:
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
            global_variables.writeScreenCapVideo = False
            return

        # If we're going to write out a screen capture video, then load it
        if global_variables.writeScreenCapVideo:
            openScreenCapOutVideo( self )
            loadScreenCapVideo( self )




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



######################################################################################
# Processors for messages

# p = participant
def writeDataToCSV( p, msg ):

    ###########################################################################################################
    # Store current WebGazer prediction from browser
    global_variables.wgCurrentX = float( msg["webGazerX"] )
    global_variables.wgCurrentY = float( msg["webGazerY"] )
    wgError = float( msg["error"] )
    wgErrorPix = float( msg["errorPix"] )


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
        global_variables.tobiiCurrentX = -1
        global_variables.tobiiCurrentY = -1
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
            global_variables.tobiiCurrentX = (td.leftScreenGazeX + td.rightScreenGazeX) / 2.0
            global_variables.tobiiCurrentY = (td.leftScreenGazeY + td.rightScreenGazeY) / 2.0
        elif td.rightEyeValid == 1 and td.leftEyeValid == 0:
            global_variables.tobiiCurrentX = td.rightScreenGazeX
            global_variables.tobiiCurrentY = td.rightScreenGazeY
        elif td.rightEyeValid == 0 and td.leftEyeValid == 1:
            global_variables.tobiiCurrentX = td.leftScreenGazeX
            global_variables.tobiiCurrentY = td.leftScreenGazeY
        else:
            # Neither is valid, so we could either leave it as the previous case,
            # which involves doing nothing, or set it to -1.
            global_variables.tobiiCurrentX = -1
            global_variables.tobiiCurrentY = -1

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

    out['error'] = wgError
    out['errorPix'] = wgErrorPix

    # Turn clmPos and eyeFeatures into per-column values
    clmPosDict = dict(zip( fmPosKeys, list(chain.from_iterable( out["clmPos"] )) ) )
    eyeFeaturesDict = dict(zip( eyeFeaturesKeys, out["eyeFeatures"] ))
    out.update( clmPosDict )
    out.update( eyeFeaturesDict )
    del out['clmPos']
    del out['eyeFeatures']

    if writeCSV:

        # A reminder of what the desired field name outputs are.
        # fieldnames = (['participant','frameImageFile','frameTimeEpoch','frameNum','mouseMoveX','mouseMoveY','mouseClickX','mouseClickY','keyPressed','keyPressedX','keyPressedY',
        #                'tobiiLeftScreenGazeX','tobiiLeftScreenGazeY','tobiiRightScreenGazeX','tobiiRightScreenGazeY','webGazerX','webGazerY','clmPos','eyeFeatures','wgError','wgErrorPix'])

        # Target dir for output
        outDir = outputPrefix + global_variables.participant.directory + '/' + \
            global_variables.participant.videos[global_variables.participant.videosPos].filename \
            + "_frames" + '/'
        # Target gaze predictions csv
        gpCSV = outputPrefix + global_variables.participant.directory + '_'  + pv.filename + '_' + csvTempName 

        with open( gpCSV, 'a', newline='' ) as f:
            # Note no quotes between clmTracker and eyeFeatures
            # f.write( "\"" + participant.directory + "\",\"" + fname + "\",\"" + str(frameTimeEpoch) + "\",\"" + str(frameNum) + "\",\"" + str(mouseMoveX) + "\",\"" + str(mouseMoveY) + "\",\"" + str(mouseClickX) + "\",\"" + str(mouseClickY) + "\",\"" + keyPressed + "\",\"" + str(keyPressedX) + "\",\"" + str(keyPressedY) + "\",\"" + str(td.leftScreenGazeX) + "\",\"" + str(td.leftScreenGazeY) + "\",\"" + str(td.rightScreenGazeX) + "\",\"" + str(td.rightScreenGazeY) + "\",\"" + str(wgCurrentX) + "\",\"" + str(wgCurrentY) + "\"," + str(clmPos) + "," + str(eyeFeatures) + "\n")
            writer = csv.DictWriter(f, fieldnames=fieldnames,delimiter=',',quoting=csv.QUOTE_ALL)
            writer.writerow( out )

    return frameTimeEpoch
################################################################################################

def newParticipant( wsh ):    
    global_variables.participantPos = global_variables.participantPos + 1

    # Check we're not at the last participant
    if global_variables.participantPos >= len(global_variables.participantDirList):
        print( "All participants completed." )
        exit()
    else:
        # Load the participant data
        global_variables.participant = ParticipantData( global_variables.participantDirList[global_variables.participantPos] )
        global_variables.participant.loadParticipantData()
        sendParticipantInfo( wsh, global_variables.participant )


class WebSocketHandler(tornado.websocket.WebSocketHandler):

    def open(self):

        global_variables.participantPos = -1
        newParticipant( self )

 
    def on_message(self, message):
        
        #######################################################################################
        # Video requested from client
        #
        msg = tornado.escape.json_decode( message )
        if msg['msgID'] == '1':
            
            #######################################
            # Extract video frames and find timestamps
            # TODO: Refactor, but be careful. Prickly code
            #
            global_variables.participant.videosPos = global_variables.participant.videosPos + 1
            pv = global_variables.participant.videos[global_variables.participant.videosPos]
            video = global_variables.participant.directory + '/' + pv.filename
            print( "Processing video: " + video )

            #
            # Make dir for output video frames
            outDir = outputPrefix +  video + "_frames" + '/'
            if not os.path.isdir( outDir ):
                os.makedirs( outDir )


            # We may have already processed this video...
            gpCSVDone = outputPrefix + global_variables.participant.directory + '_' + pv.filename + '_' + csvDoneName
            gpCSV = outputPrefix + global_variables.participant.directory + '_'  + pv.filename + '_' + csvTempName
            if os.path.isfile(gpCSVDone ):
                print( "    " + gpCSVDone + " already exists and completed; moving on to next video...")
                sendVideoEnd( self )
                return
            elif os.path.isfile( gpCSV ):
                print( "    " + gpCSV + " exists but does not have an entry for each file; deleting csv and starting this video again...")
                os.remove(gpCSV)

                # Write the header for the new gazePredictions.csv file
                if writeCSV:
                    with open(gpCSV, 'w', newline='' ) as csvfile:
                        writer = csv.DictWriter(csvfile, fieldnames=fieldnames,delimiter=',',quoting=csv.QUOTE_ALL)
                        writer.writeheader()            

            # If we're not done, we need to extract the video frames (using ffmpeg).
            # If this is already done, we write 'framesExtracted.txt'
            #
            framesDoneFile = outDir + '/' + "framesExtracted.txt"
            if not os.path.isfile( framesDoneFile ):
                print( "    Extracting video frames (might take a few minutes)... " + str(video) )
                completedProcess = subprocess.run('ffmpeg -i "./' + video + '" -vf showinfo "' + outDir + 'frame_%08d.png"'\
                    , stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, shell=True)

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
            frameTimeEpoch = writeDataToCSV( global_variables.participant, msg )

            if global_variables.writeScreenCapVideo:
                writeScreenCapOutputFrames( global_variables.participant, frameTimeEpoch )

            ##################################
            # Send the next frame of the video
            pv = global_variables.participant.videos[global_variables.participant.videosPos]
            pv.frameFilesPos = pv.frameFilesPos + 1
            
            # If the video frame is the last available video frame, send a message to this effect
            if pv.frameFilesPos >= len(pv.frameFilesList):

                if global_variables.writeScreenCapVideo:
                    closeScreenCapOutVideo( global_variables.participant )

                outDir = outputPrefix + global_variables.participant.directory + '/' + pv.filename + "_frames" + '/'
                gpCSV = outputPrefix + global_variables.participant.directory + '_' + pv.filename +'_' + csvTempName 
                gpCSVDone = outputPrefix + global_variables.participant.directory + '_'  + pv.filename + '_' + csvDoneName
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
    global_variables.init()

    ###########################################################################################################
    # Enumerate all P_ subdirectories if not yet done
    regex = re.compile('P_[0-9][0-9]')

    global_variables.participantDirList = []
    for root, dirs, files in os.walk('.'):
        for d in dirs:
            if regex.match(d):
               global_variables.participantDirList.append(d)

    global_variables.participantDirList = sorted( global_variables.participantDirList )

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
