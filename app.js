const express = require('express')
const path = require('path')
const db = require('./db')
const session = require('express-session');
const { READONLY } = require('sqlite3');

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.use(
    session({
        secret: "librarysecret",
        resave: false,
        saveUninitialized: false
    })
)

app.get("/", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    db.get(`SELECT * FROM LIBRARIANS WHERE EMAIL=? AND PASSWORD = ? `, [email, password], (err, row) => {
        if (row) {
            req.session.librarians = row
            return res.redirect('/dashboard');
        } else {
            res.render("login", { error: "Invalid Credentials" })
            console.log(err);
        }
    })
})

function isLoggedIn(req, res, next) {
    if (req.session.librarians) {
        next();
    }
    else {
        res.redirect('/')
    }
}

app.get('/dashboard', isLoggedIn, (req, res) => {
    db.get(`SELECT COUNT(*) AS TOTAL_BOOKS FROM BOOKS`, (err, books) => {
        db.get(`SELECT COUNT(*) AS TOTAL_BORROWED FROM BORROWEDBOOKS`, (err, borrowed) => {

            db.get(`SELECT COUNT(*) AS TOTAL_VISITS FROM LIBRARYVISITS`, (err, visits) => {
                res.render("dashboard", {
                    librarian: req.session.librarians,
                    totalBooks: books.TOTAL_BOOKS,
                    totalBorrowed: borrowed.TOTAL_BORROWED,
                    totalVisits: visits.TOTAL_VISITS
                })
            })
        })
    })
})

app.get('/books/add', isLoggedIn, (req, res) => {
    res.render("addBook")
});

app.get('/books', isLoggedIn, (req, res) => {
    db.all(`SELECT * FROM BOOKS`, (err, rows) => {
        res.render("books", { books: rows })
    });
});

app.post('/books/add', isLoggedIn, (req, res) => {
    const title = req.body.title;
    const author = req.body.author;
    const quantity = req.body.quantity;

    db.run(`
        INSERT INTO BOOKS (title,author,quantity) VALUES(?,?,?)
        `, [title, author, quantity], (err) => {
        if (!err) {
            res.redirect('/books');
        } else {
            console.log(err);
            res.send("Failed to add book to the database.");
        }
    })
});

app.get('/students/add', isLoggedIn, (req, res) => {
    res.render("addStudent")
});

app.post('/students/add', isLoggedIn, (req, res) => {
    const usn = req.body.usn;
    const name = req.body.name;
    const branch = req.body.branch;

    db.run(`
        INSERT INTO STUDENTS (usn, name, branch) VALUES(?,?,?)
        `, [usn, name, branch], (err) => {
        if (!err) {
            res.redirect('/students');
        } else {
            console.log(err);
            res.send("Failed to add student to the database.");
        }
    })
});

app.get('/books/delete/:id', isLoggedIn, (req, res) => {
    db.get(`SELECT COUNT(*) AS active_borrows FROM BORROWEDBOOKS WHERE bookid = ? AND status != 'Returned'`, [req.params.id], (err, count) => {
        if (err) {
            console.log(err);
            return res.send("Database error.");
        }

        if (count.active_borrows > 0) {
            return res.send('<script>alert("Cannot delete book: Copies are currently borrowed by students!"); window.location.href="/books";</script>');
        }
        db.run(`DELETE FROM BOOKS WHERE id=?`, [req.params.id], (err) => {
            if (!err) {
                res.redirect("/books")
            } else {
                console.log(err);
                res.send("Error deleting book.");
            }
        })
    })
})

app.get('/books/editbook/:id', isLoggedIn, (req, res) => {
    db.get(`SELECT * FROM BOOKS WHERE id = ?`,
        [req.params.id], (err, row) => {
            if (!err) {
                res.render("editBook", { book: row });
            } else {
                console.log(err);
                res.send("Error editing book.");
            }
        })
})

app.post('/books/editbook/:id', isLoggedIn, (req, res) => {
    const title = req.body.title;
    const author = req.body.author;
    const quantity = req.body.quantity;

    db.run(`UPDATE BOOKS SET title=?, author=?, quantity=? WHERE id=?`,
        [title, author, quantity, req.params.id], (err) => {
            if (!err) {
                res.redirect('/books')
            }
        })
})

app.get('/books/issue/:id', isLoggedIn, (req, res) => {
    db.get(`SELECT * FROM BOOKS WHERE id = ?`,
        [req.params.id], (err, row) => {
            if (!err) {
                res.render("issueBook", { book: row });
            }
        })
})

app.post("/books/issue", isLoggedIn, (req, res) => {
    const usn = req.body.usn.trim().toUpperCase();
    const bookid = req.body.bookid;

    db.get(`SELECT * FROM STUDENTS WHERE usn = ?`, [usn], (err, student) => {
        if (err) return res.send("Database error.");
        if (!student) return res.send("Error: Student USN does not exist in the system.");

        db.get(`SELECT quantity FROM BOOKS WHERE id = ?`, [bookid], (err, book) => {
            if (err) return res.send("Database error.");
            if (!book) return res.send("Error: Book does not exist.");
            if (book.quantity <= 0) return res.send("Error: This book is currently out of stock.");
            db.get(`SELECT * FROM BORROWEDBOOKS WHERE usn = ? AND bookid = ? AND status != 'Returned'`, [usn, bookid], (err, activeBorrow) => {

                if (err)
                    return res.send("Database error.");

                if (activeBorrow)
                    return res.send('<script>alert("Error: This student already has a copy of this book unreturned!"); window.location.href="/books";</script>');

                const today = new Date();
                const borrow_date = today.toISOString().split('T')[0];
                const status = 'Borrowed';
                const retdate = new Date(borrow_date);
                retdate.setDate(retdate.getDate() + 15);
                const return_date = retdate.toISOString().split('T')[0];

                db.run(`
        INSERT INTO BORROWEDBOOKS (usn,bookid,borrow_date,return_date,status) VALUES(?,?,?,?,?)
        `, [usn, bookid, borrow_date, return_date, status], (err) => {
                    if (err) {
                        console.log(err);
                        return res.send("Error saving the transaction.");
                    }
                    db.run(`UPDATE BOOKS SET quantity=quantity-1 WHERE id=? AND quantity>0`,
                        [bookid], (err) => {
                            if (err) {
                                console.log(err);
                                return res.send("Error saving the transaction.");
                            }
                            res.redirect('/books');

                        })
                })
            })
        })
    })
})

app.get("/students", isLoggedIn, (req, res) => {
    db.all(`SELECT * FROM STUDENTS`, (err, rows) => {
        res.render("student", { students: rows })
    })
})

app.get('/students/delete/:usn', isLoggedIn, (req, res) => {

    db.get(`SELECT COUNT(*) AS active_books FROM BORROWEDBOOKS WHERE usn = ? AND status != 'Returned'`, [req.params.usn], (err, count) => {
        if (err) return res.send("Database error.");

        if (count.active_books > 0) {
            return res.send('<script>alert("Cannot delete student: They must return all their books first!"); window.location.href="/students";</script>');
        }

        db.run(`DELETE FROM STUDENTS WHERE USN = ?`, [req.params.usn], (err) => {
            if (err) {
                console.log(err);
                res.send("Failed to delete student");
            } else {
                db.run(`DELETE FROM BORROWEDBOOKS WHERE USN=?`, [req.params.usn], (err) => {
                    if (err) {
                        console.log(err);
                        res.send("Failed to clean up records");
                    }
                    res.redirect('/students')
                })
            }
        })
    })

})

app.get('/borrowedbooks', isLoggedIn, (req, res) => {
    db.all(`SELECT R.*, B.title AS title FROM BORROWEDBOOKS R, BOOKS B WHERE B.id=R.bookid`, (err, rows) => {

        if (!err) {
            res.render('borrowedBooks', { b_books: rows })
        } else {
            console.log(err);
            res.send("Failed to get book from the database.");
        }
    })
})

app.get('/visits', isLoggedIn, (req, res) => {
    db.all(`select s.usn,s.name,s.branch,l.entry_time,l.exit_time,l.duration,l.status
            from LIBRARYVISITS l,STUDENTS s 
            where s.usn=l.usn`, (err, rows) => {
        if (!err) {
            res.render('visits', { b_books: rows })
        } else {
            console.log(err);
            res.send("Failed to get visits from the database.");
        }
    })
})

app.post('/borrowedbooks/returned/:id', isLoggedIn, (req, res) => {
    db.run(`UPDATE BORROWEDBOOKS SET status='Returned' WHERE ID = ? AND status != 'Returned'`, [req.params.id], (err) => {
        if (err) {
            console.log(err);
            res.send("Error returning book.");
        }

        if (this.changes === 0) {
            return res.redirect('/borrowedbooks');
        }

        db.run(`UPDATE BOOKS 
            SET quantity = quantity + 1 
            WHERE id = (SELECT bookid FROM BORROWEDBOOKS WHERE id = ?)`, [req.params.id], (err) => {
            if (err) {
                console.log(err);
                res.send("Error in updating books");
            }

            res.redirect('/borrowedbooks');
        })
    })
})

app.post("/libraryvisits", (req, res) => {
    const usn = req.body.usn.trim().toUpperCase();

    db.get(`SELECT * FROM students WHERE usn=?`, [usn], (err, student) => {
        if (!student) {
            req.session.error = "Student not found (Invalid USN)";
            return res.redirect('/libraryvisits');
        }

        db.get(`SELECT * FROM LIBRARYVISITS WHERE USN=? ORDER BY id DESC LIMIT 1`, [usn], (err, row) => {
            if (err) {
                console.log(err);
                return res.send("Error getting status.");
            }

            const cur = new Date();

            if (!row || row.status !== 'IN') {
                db.run(
                    `INSERT INTO LIBRARYVISITS (usn, entry_time, exit_time, duration, status) VALUES (?, ?, null, null, 'IN')`, [usn, cur.toISOString()], (err) => {
                        if (err) return console.log(err);
                        console.log(`${usn} logged IN.`);

                        req.session.lastVisit = { status: 'IN', entry_time: cur.toISOString() };

                        res.redirect('/libraryvisits');
                    }
                );
            } else {
                const entry = new Date(row.entry_time);
                const dur = cur - entry;

                const totalMin = Math.floor(dur / (1000 * 60));
                const totalSec = Math.floor((dur % (1000 * 60)) / 1000);

                let duration;
                if (totalMin === 0) {
                    duration = `${totalSec} seconds`;
                } else {
                    duration = `${totalMin} mins, ${totalSec} seconds`;
                }

                db.run(
                    `UPDATE LIBRARYVISITS SET exit_time=?, duration=?, status='OUT' WHERE id=?`, [cur.toISOString(), duration, row.id], (err) => {
                        if (err) return console.log(err);
                        console.log(`${usn} logged OUT.`);

                        req.session.lastVisit = {
                            status: 'OUT',
                            entry_time: row.entry_time,
                            exit_time: cur.toISOString(),
                            duration: duration
                        };

                        res.redirect('/libraryvisits');
                    }
                );
            }
        })
    })
})

app.get("/libraryvisits", (req, res) => {

    const visitStats = req.session.lastVisit || null;
    const errorMessage = req.session.error || null;

    if (visitStats || errorMessage) {
        res.set('Refresh', '4; url=/libraryvisits');
    }

    req.session.lastVisit = null;
    req.session.error = null;

    db.all(`SELECT * FROM LIBRARYVISITS ORDER BY id DESC`, (err, rows) => {
        if (err) {
            console.log(err);
            return res.send("Error loading visits.");
        }
        
        res.render('libraryvisits', {
            visit: visitStats,
            error: errorMessage,
            tableData: rows
        });
    });
})

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        return res.redirect('/');
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
});