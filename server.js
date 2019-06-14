
// Dependencies
var express = require("express");
var mongojs = require("mongojs");
var axios = require("axios");
var cheerio = require("cheerio");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);


// Handlebars
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main"
    })
);
app.set("view engine", "handlebars");

// // Database configuration
// var databaseUrl = "newsScraper";
// var collections = ["scrapedData"];

// // Hook mongojs configuration to the db variable
// var db = mongojs(databaseUrl, collections);
// db.on("error", function (error) {
//     console.log("Database Error:", error);
// });

// Main route 
app.get("/", function (req, res) {
    db.Article.find({}).then(data => {
        console.log(data)

        res.render("index", { articles: data });
    })
});



app.get("/all", function (req, res) {

    axios.get("https://www.geeksforgeeks.org/").then(function (response) {
        // Load the Response into cheerio and save it to a variable
        // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
        var $ = cheerio.load(response.data);

        // An empty array to save the data that we'll scrape


        // With cheerio, find each p-tag with the "title" class
        // (i: iterator. element: the current element)
        $("article").each(function (i, element) {
            // Save the text of the element in a "title" variable
            var results = {};
            results.title = $(this)
                .children("header")
                .text()
                .slice(12)
                .split("\n")
                .toString();
                

            // In the currently selected element, look at its child elements (i.e., its a-tags),
            // then save the values for any "href" attributes that the child elements may have
            results.link = $(this)
                .children("header")
                .children("h2")
                .children("a")
                .attr("href");


            results.summary = $(this)
                .children(".entry-summary")
                .text()
                .slice(15)
                .split("\n\t\t")
                .toString();

            db.Article.create(results)
                .then(function (dbArticle) {
                    // View the added result in the console
                    // console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
            // Save these results in an object that we'll push into the results array we defined earlier
            // if (title && link && summary) {
            //     results.push({
            //         title: title[0],
            //         link: link,
            //         summary: summary
            //     });
            // }

        });
        res.send("Scrape Complete!");
    });
});



app.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the comments associated with it
        .populate("Comment")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Comment
app.post("/articles/:id", function (req, res) {
    // Create a new comment and pass the req.body to the entry
    db.Comment.create(req.body)
        .then(function (dbComment) {
            // If a Comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Comment
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbComment._id }, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});


// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});