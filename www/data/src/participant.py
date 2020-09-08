import csv
import glob
import math
import os
import json
from decimal import Decimal
import tornado.escape

import global_variables

pctFile = "participant_characteristics.csv"


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
                    if row[9] != '':
                        self.screencapStartTime = int(row[9])  # 20180316 JT Note: the value in the .csv is currently inaccurate or incomplete
                    else:
                        self.screencapStartTime = 0
                    break

        ########################
        # WebGazer event log
        # *dot_test_instructions.webm is the first video file.
        webMFile = glob.glob( self.directory + '/' + '*dot_test_instructions.webm' )
        # Split the video name into its pieces
        try:
            f = os.path.split( webMFile[0] )[1]
        except IndexError:
            raise OSError('Files are not in right location, see https://webgazer.cs.brown.edu/data/ for details'\
            + 'on how to correct this')

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
