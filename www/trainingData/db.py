import sqlite3

class Examples:

    def __init__(self):
        self.connect()

    def connect(self):
        self.conn = sqlite3.connect('training.db')
        self.c = self.conn.cursor()

    schema = ['id', 'positions', 'width', 'x', 'y', 'type', 'img id', 'timestamp']

    def remake(self):
        c.execute('''CREATE TABLE examples
                    (exampleid INTEGER PRIMARY KEY, positions TEXT, width INTEGER, x REAL, y REAL, type TEXT, img INTEGER, timestamp INTEGER)''')
        conn.commit()

    def pretty_print(cursor):
        for row in cursor:
            pr = ''
            for i, col in enumerate(row):
                pr += ' ' + schema[i] + ': ' + str(col)
            print (pr)

    def close(self):
        self.conn.close()

    def lookup_by_type(self, t):
        return self.c.execute('SELECT * FROM examples WHERE type = ?', (t))
