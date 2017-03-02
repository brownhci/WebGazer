outfileName = 'webgazer.js'
listfileName = 'toCombine'

with open(listfileName) as f:
    filenames = f.readlines()
filenames = [x.strip() for x in filenames]

with open(outfileName, 'w') as outfile:
    for fname in filenames:
        with open(fname) as infile:
            outfile.write(infile.read())
            outfile.write('\n')
