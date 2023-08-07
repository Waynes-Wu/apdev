##  E-Tabi Storage-Tracking Application ##

E-Tabi is a storage-tracking application designed to help users keep track of their items placed inside or removed from their storage units. It offers several convenient features that aid in managing and organizing the storage process. From visualizing images and descriptions of stored items to monitoring rent due dates and maintaining a complete history of access, E-Tabi provides valuable tools for efficient storage management.

Features:
User Authentication:
Secure user authentication and session management for accessing the application.
User registration with unique email validation.

Database Connectivity:
MongoDB database integration for storing user information, entries, and edit history.

Entry Management:
Create, view, update, and delete entries for stored items.
Each entry includes name, date, description, condition, and an associated image.

User Interface:
Web interface for users to interact with the application.
HTML, CSS, and Handlebars templates used to display and manage user interfaces.

QR Code Generation and Management:
Generate QR codes for items using the "qrcode" library.
Store QR codes as image files and associate them with user accounts.

Edit History Tracking:
Maintain an edit history for each user, tracking actions such as adding, editing, and removing entries.
Record timestamps for edit history events.

In order for the program to run via localhost:3000, the user must first install the prerequisite npm packages:

```npm install```

To run the program, run it via: 

```npm start```

To view the website, go to your browser via https://localhost:3000
