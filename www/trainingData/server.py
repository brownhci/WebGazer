from http.server import BaseHTTPRequestHandler,HTTPServer
from os import curdir, sep
import cgi
import base64
import sqlite3
import random
import json

PORT_NUMBER = 8000

conn = sqlite3.connect('trainingData/training.db')
c = conn.cursor()


#This class will handles any incoming request from
#the browser
class myHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        mimetype='text/html'
        f = open(curdir + sep + self.path)
        self.send_response(200)
        self.send_header('Content-type',mimetype)
        self.end_headers()
        self.wfile.write(f.read())
        print ('get operation')
        f.close()

    #Handler for the POST requests
    def do_POST(self):
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                'REQUEST_METHOD':'POST',
                'CONTENT_TYPE':self.headers['Content-Type'],
            }
        )

        print ("data: %s" % form["data"].value)
        values = json.loads(form['data'].value)
        positions = json.dumps(values['positions'])
        img_id = random.getrandbits(32)
        f = open(curdir + sep + 'trainingData' + sep + 'img' + str(img_id) + '.png', 'wb+')
        img = form["img"].value.strip("data:image/png;base64")
        f.write(base64.b64decode(img))
        f.close()
        c.execute('INSERT INTO examples VALUES (?,?,?,?,?,?,?,?)', (None, positions,values['width'], values['x'], values['y'], values['type'], img_id, values['timestamp']))
        conn.commit()
        self.send_response(200)
        self.end_headers()
        return


try:
    #Create a web server and define the handler to manage the
    #incoming request
    server = HTTPServer(('', PORT_NUMBER), myHandler)
    print ('Started httpserver on port ' , PORT_NUMBER)
    c.execute('''CREATE TABLE IF NOT EXISTS examples
                    (exampleid INTEGER PRIMARY KEY, positions TEXT, width INTEGER, x REAL, y REAL, type TEXT, img INTEGER, timestamp INTEGER)''')
    conn.commit()
    #Wait forever for incoming http requests
    server.serve_forever()

except KeyboardInterrupt:
    print ('^C received, shutting down the web server')
    conn.close()
    server.socket.close()

