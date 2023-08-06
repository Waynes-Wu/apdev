const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const qrcode = require("qrcode");
const path = require("path");
const multer = require('multer'); // for the image URLs
const fs = require('fs'); // files
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;

const app = express();

//test response
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(bodyParser.json())

app.use(express.static('html', { index: 'login.html' }));

//needed so that the images are visualized
app.use('/uploads', express.static('uploads'));

// url to the database
mongoose.connect('mongodb://127.0.0.1:27017/E-Tabi_DB')
const db = mongoose.connection

db.on('error', () => console.log("Failed to Connect to Database"))
db.once('open', () => console.log("Successfully Connected to Database"))

//user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  }
});

const User = mongoose.model("User", userSchema);


//gets values from the html
app.post("/accountcreation", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Check if the email already exists
    const existingEmail = await User.findOne({ email }).exec();

    if (existingEmail) {
      const errorMessage = "The email has already been taken. Please try a different one.";
      return res.status(409).json({ error: errorMessage });
    }

    else {
      const newUser = new User({
        username,
        password,
        email,
      });

      // Save the user to the database
      await newUser.save();

      // User creation successful, redirect to the login page
      return res.status(201).json({ message: 'User registered successfully' });
    }
  } catch (error) {
    console.error('Error checking email address:', error);
    const errorMessage = "An error occurred while creating the account. Please try again.";
    return res.status(500).json({ error: errorMessage });
  }
});

//checks login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user in the database based on the username and password
    const user = await User.findOne({ username, password }).exec();

    if (!user) {
      const errorMessage = encodeURIComponent("Invalid username or password. Please try again.");
      return res.redirect(`/login.html?error=${errorMessage}`);
    }

    // User is authenticated
    return res.redirect('index.html');
  } catch (error) {
    console.error('Error during login:', error);
    const errorMessage = "An error occurred during login. Please try again.";
    return res.redirect(`/login.html?error=${encodeURIComponent(errorMessage)}`);
  }
});

//entry schema
const entrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  date: {
    type: Date,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  condition: {
    type: String,
    required: true
  },

  imageURL: {
    type: String,
    required: true
  }
});

const editHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['edit', 'add', 'remove'],
    required: true,
  },
  // user: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  // },
  entry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entry',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Entry = mongoose.model('Entry', entrySchema);
const EditHistory = mongoose.model('EditHistory', editHistorySchema);




//needed multer stuff
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads'); // directory where the images will be stored
  },
  filename: function (req, file, cb) {
    // if it already has a timestamp, it removes it
    const originalFilename = file.originalname;
    const indexOfTimestamp = originalFilename.indexOf('-');
    const trimmedFilename = indexOfTimestamp !== -1 ? originalFilename.slice(indexOfTimestamp + 1) : originalFilename;

    cb(null, Date.now() + '-' + trimmedFilename); // naming the image file with a timestamp 
  }
});

const upload = multer({ storage: storage });

//saving the entry
app.post('/upload', upload.single('unit-image'), async (req, res) => {
  try {
    const { name, date, description, condition } = req.body;

    const imageURL = req.file.filename; // multer generates the file name and contains the path to the uploaded image

    const newEntry = new Entry({
      name,
      date,
      description,
      condition,
      imageURL
    });

    await newEntry.save();

    const newEditHistory = new EditHistory({
      action: 'add',
      entry: newEntry._id,
    });
    await newEditHistory.save();

    res.status(201).json({ message: 'Entry created successfully' });
  } catch (error) {
    console.error('Entry name already taken', error);
    res.status(500).json({ error: 'There is already an entry with the existing name, change it' });
  }
});

//gets entries from the db
app.get('/archive', async (req, res) => {
  try {
    // fetches all entries from the database
    const allEntries = await Entry.find({}).lean().exec();

    // sends the entries data to the HTML page
    res.render('archive', { entries: allEntries });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'An error occurred while fetching entries' });
  }
});

//updating entry
app.post('/update', upload.single('editImage'), async function (req, res) {
  try {
    const { editName, editDate, editDesc, editCond, idName } = req.body; // these need to match the form names
    const imageURL = req.file.filename;

    const existingEntry = await Entry.findOne({ name: idName }).exec();

    if (!existingEntry) {
      return res.status(404).json({ error: `Entry with ID ${idName} not found` });
    }

    const oldImage = existingEntry.imageURL.split('/').pop();
    fs.unlinkSync(path.join('uploads', oldImage));

    existingEntry.name = editName;
    existingEntry.date = editDate;
    existingEntry.description = editDesc;
    existingEntry.condition = editCond;
    existingEntry.imageURL = imageURL;

    await existingEntry.save();

    // ! history
    const newEditHistory = new EditHistory({
      action: 'edit',
      entry: existingEntry._id,
    });
    await newEditHistory.save();


    res.json({ message: 'Entry update successful' });

  } catch (error) {
    console.error("Error during update:", error);
    res.status(500).json({ message: 'Error while updating entry' });
  }
});

//deleting entry
app.post('/delete', async (req, res) => {
  try {
    const { idName } = req.body;

    const existingEntry = await Entry.findOne({ name: idName }).exec();

    if (!existingEntry) {
      return res.status(404).json({ error: `Entry with ID ${idName} not found` });
    }

    await existingEntry.deleteOne();

    // deletes it in the folder
    const deleteImage = existingEntry.imageURL.split('/').pop();
    fs.unlinkSync(path.join('uploads', deleteImage));

    // ! history
    const newEditHistory = new EditHistory({
      action: 'remove',
      entry: existingEntry._id,
    });
    await newEditHistory.save();

    res.json({ message: 'Entry deletion successful' });
  } catch (error) {
    console.error("Error during entry deletion:", error);
    res.status(500).json({ message: 'Error while deleting entry' });
  }
});

app.get("/", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })

  return res.redirect('signup.html')
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', '/login.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', '/contactus.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', '/about.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', '/upload.html'));
});

// app.get('/archive', (req, res) => {
//   res.render('archive'); 
// });

app.get('/qr', async (req, res) => {

  const stJson = JSON.stringify("gyg");
  //const qrCodeFilePath = path.join(__dirname, "qrcodes", `${username}_qrcode.png`);
  const qrCodeDataUrl = await qrcode.toDataURL(stJson);
  res.json({ qrCodeDataUrl });
});

app.set('view engine', 'hbs');

app.set('views', path.join(__dirname, 'html'));

hbs.registerHelper('formatDate', (date) => {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return formattedDate;
});


app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
}); 
