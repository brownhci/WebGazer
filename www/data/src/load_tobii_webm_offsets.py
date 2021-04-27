import csv
import math

filename = "tobii_webm_offsets.csv"

offsetDict = {}

def load():
    # given filename, load offsets from fn used to get a better correlation between Tobii predictions and webm video recording

    with open( filename ) as file:
        readCsv = csv.reader(file, delimiter=',')

        readCsv.__next__() # throw away first line

        for row in readCsv:
            # only the first 2 columns of each row are used
            [videoDir, video] = row[0].split('/')
            offset = math.ceil(float(row[1]) * 1000) # offset in seconds, converted to to ms, rounded up
            # offset = round(float(row[1]) * 1000) # uncomment for banker's rounding (round towards even number)

            if videoDir not in offsetDict:
                offsetDict[videoDir] = {}

            offsetDict[videoDir][video] = offset