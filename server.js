const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")

const PORT = process.env.PORT || 3000;

const app = express();

//test response

app.use(bodyParser.urlencoded({
  extended:true
}))

app.use(bodyParser.json())

app.use(express.static('html', { index: 'login.html' }));

// url to the database
mongoose.connect('mongodb://localhost:27017/E-Tabi_DB')
const db = mongoose.connection

db.on('error', () => console.log ("Failed to Connect to Database"))
db.once('open', () => console.log ("Successfully Connected to Database"))

//gets values from the html
app.post("/accountcreation", (req, res) => {
  const username = req.body.username
  const password = req.body.password
  const email = req.body.email

  // the data gets stored in this object:
  const personal_data = {
    "username": username,
    "password": password,
    "email": email
  }

  db.collection('users').insertOne(personal_data, (error, collection) =>{
    //if there is an error, throw it
    if(error){
      throw error
    }
    //if there isnt
    console.log("Record Saved");
  });

  //after recording data, fresh page
  return res.redirect('login.html')

});

app.get("/", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })

  return res.redirect('signup.html')
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  }); 
