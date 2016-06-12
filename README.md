# citemap
CiteMap is a multipurpose visual note organization application.

Last update: 2016-06-01
Alexander Gutierrez

BEFORE RUNNING:
Be connected to the internet. The current build includes JQuery served by Google in a few lines of code for notational convenience.
Requires browser supporting HTML5 and CSS3 and JavaScript. Recommended to use a current Firefox or Chrome version.

TO RUN:
Open index.html in a browser

Tested on:
Mozilla Firefox 46.0.1
Google Chrome 51.0.2704.79 m

USAGE INSTRUCTIONS:
Create Node: Double click on canvas
Edit Node: Double click on node

Link Nodes: Hold link key (either 'r','e','w' currently, corresponding to different link types) and click and drag mouse from one node to another

Move Node: Click node and drag
Delete Node: Click node and press Delete key
Pan Canvas: Click and drag empty canvas area
Zoom Canvas: Mouse scroll (has min/max zoom levels to avoid getting lost)

Other Notes:
The save, load, and manage buttons on the side menu don't work yet. Save and load will connect to a database. Manage will bring up another menu to edit link types.
The application comes preloaded with some dummy data written in the init() function in draw.js
