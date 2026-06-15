const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("library.db", (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("DB connected");
    }
});

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS LIBRARIANS(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS STUDENTS(
            usn TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            branch TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS BOOKS(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            UNIQUE(title, author)
        )
    `);

    db.run(`
CREATE TABLE if not exists BORROWEDBOOKS(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usn TEXT,
    bookid INTEGER,
    borrow_date DATE,
    return_date DATE,
    status TEXT,
    UNIQUE(usn, bookid, borrow_date)
)
    `);

    // db.run(`
    //     CREATE TABLE IF NOT EXISTS LIBRARYVISITS(
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         usn TEXT,
    //         entry_time TEXT,
    //         exit_time TEXT,
    //         duration TEXT,
    //         status TEXT,
    //         UNIQUE(usn, entry_time)
    //     )
    // `);

    // db.run(`
    //     INSERT OR IGNORE INTO LIBRARIANS(name,email,password)
    //     VALUES
    //     ('Atharva Joshi','atharva@gmail.com','pass123'),
    //     ('Ananya Shetty','ananya@gmail.com','lib123'),
    //     ('Rahul Kumar','rahul@gmail.com','admin123'),
    //     ('Sneha Rao','sneha@gmail.com','sneha123')
    // `);

    // db.run(`
    //     INSERT OR IGNORE INTO STUDENTS
    //     VALUES
    //     ('NNM24CS001','Aditya Karkera','CSE'),
    //     ('NNM24CS002','Atmika Nayak','CSE'),
    //     ('NNM24CS003','Rakesh Shetty','ISE'),
    //     ('NNM24CS004','Akshay Kumar','ISE'),
    //     ('NNM24CS005','Govinda Rao','ECE'),
    //     ('NNM24CS006','Shyam Prasad','CSE')
    // `);

    // db.run(`
    //     INSERT OR IGNORE INTO BOOKS(title,author,quantity)
    //     VALUES
    //     ('Clean Code','Robert C. Martin',5),
    //     ('Introduction to Algorithms','Thomas H. Cormen',3),
    //     ('Database System Concepts','Abraham Silberschatz',4),
    //     ('Operating System Concepts','Galvin',6),
    //     ('Computer Networks','Andrew Tanenbaum',2)
    // `);

    // db.run(`
    //     INSERT OR IGNORE INTO BORROWEDBOOKS
    //     (usn,bookid,borrow_date,return_date,status)
    //     VALUES
    //     ('NNM24CS001',1,'2025-06-01','2025-06-15','Returned'),
    //     ('NNM24CS002',3,'2025-06-03','2025-06-17','Borrowed'),
    //     ('NNM24CS004',2,'2025-06-05','2025-06-19','Borrowed')
    // `);

    // db.run(`
    //     INSERT OR IGNORE INTO LIBRARYVISITS
    //     (usn,entry_time,exit_time,duration,status)
    //     VALUES
    //     ('NNM24CS001','2026-06-12T06:00:00.929Z','2026-06-12T06:30:30.929Z','2 Hours','OUT'),
    //     ('NNM24CS002','2026-06-12T08:00:00.929Z','2026-06-12T09:00:00.929Z','1.5 Hours','OUT'),
    //     ('NNM24CS003','2026-06-12T01:00:00.929Z','2026-06-12T03:50:30.929Z','1.5 Hours','OUT')
    // `);

    db.all("SELECT * FROM LIBRARIANS", (err, rows) => {
        console.log("\nLIBRARIANS");
        console.table(rows);
    });

    db.all("SELECT * FROM STUDENTS", (err, rows) => {
        console.log("\nSTUDENTS");
        console.table(rows);
    });

    db.all("SELECT * FROM BOOKS", (err, rows) => {
        console.log("\nBOOKS");
        console.table(rows);
    });

    db.all("SELECT * FROM BORROWEDBOOKS", (err, rows) => {
        console.log("\nBORROWEDBOOKS");
        console.table(rows);
    });

    db.all("SELECT * FROM LIBRARYVISITS", (err, rows) => {
        console.log("\nLIBRARYVISITS");
        console.table(rows);
    });

    console.log("Database initialized");
});

module.exports = db;