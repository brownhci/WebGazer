import os
import datetime
import pytz
import tornado.escape
import csv
import cv2
import numpy as np

from participant import newParticipant
import global_variables


##################################################################
# Image/video operations
#
def readImageRGBA( filename ):
    # Add an alpha channel, because JavaScript ImageData object requires rgba, and I think it'll be quicker to do it in numpy
    b_channel, g_channel, r_channel = cv2.split( cv2.imread( filename ) )
    a_channel = np.ones(b_channel.shape, dtype=b_channel.dtype) * 255
    return cv2.merge((r_channel, g_channel, b_channel, a_channel))

# p = global_variables.participant
def loadScreenCapVideo( p ):

    ##########################################################################
    # Load new screen capture video
    if global_variables.writeScreenCapVideo:
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

        if global_variables.useAaronCircles and os.path.isfile( circleSynchroCSV ):
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


# p = global_variables.participant
def writeScreenCapOutputFrames( p, frameTimeEpoch ):

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
            center = ( int(p.screencapFrameWidth * float(global_variables.tobiiCurrentX)), int(p.screencapFrameHeight * float(global_variables.tobiiCurrentY)) )
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
                center = ( int(p.screencapFrameWidth * float(global_variables.tobiiCurrentX)), int(p.screencapFrameHeight * float(global_variables.tobiiCurrentY)) )
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

def sendVideoFrame( wsh, fn, pv ):

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
               'tobiiX': "{:+.4f}".format(global_variables.tobiiCurrentX),
               'tobiiY': "{:+.4f}".format(global_variables.tobiiCurrentY)})
    wsh.write_message( tornado.escape.json_encode(parcel) )
    wsh.write_message( readImageRGBA( fn ).tobytes(), binary=True )
    #can delete images here for convenience - causes errors on rereading
    #os.remove(fn)

def sendVideoEnd( wsh ):

    # Progress video if not at end of video list for global_variables.participant
    if global_variables.participant.videosPos+1 >= len(global_variables.participant.videos):
        # New global_variables.participant!
        newParticipant( wsh )

    else:
        # Regular 'video end' message; will trigger return of {'msgID': "1"}
        parcel = {'msgID': "4"}
        wsh.write_message( tornado.escape.json_encode(parcel) )

