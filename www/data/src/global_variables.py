def init():
    global tobiiCurrentX, tobiiCurrentY
    global participant
    global writeScreenCapVideo, useAaronCircles
    global wgCurrentX, wgCurrentY
    global pctFile
    global participantPos, participantDirList
    global onlyWritingVideos
    # Options
    
    onlyWritingVideos = True    # Only process videos where the participant is asked to write into a text field
    writeScreenCapVideo = False
    useAaronCircles = False

    # global_variables for current state of eye tracking
    tobiiCurrentX = 0
    tobiiCurrentY = 0
    wgCurrentX = 0
    wgCurrentY = 0


    # Which participant are we on?
    participantDirList = []
    participantPos = -1
    participant = []
