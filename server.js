require("dotenv/config");
const express = require('express')
const passport = require("passport");
const sql = require('mssql');
const session = require("express-session");
const bodyParser = require("body-parser");
const SpotifyStrategy = require('passport-spotify').Strategy;
const got = require('got');

const app = express();

/** Our sql wrapper
 * This will grab the result of the first select statement.
 */
async function sqlQuery(...args) {
    const result = await sql.query(...args);
    return result?.recordsets?.[0]?.[0];
}

/** Our sql wrapper
 * This will grab the result of the first select statement.
 */
async function sqlQueryManyResults(...args) {
    const result = await sql.query(...args);
    return result?.recordsets?.[0];
}

/** SQL Query */
function findUserBySpotifyId(spotifyId) {
    return sqlQuery/* sql */`
    SELECT * FROM users
    WHERE spotify_id = ${spotifyId}
    `;
}

async function getVenueByID(venueId) {
    return sqlQuery/* sql */`
    SELECT * FROM jukebox_venue
    WHERE id = ${venueId}
    `; 
}


async function getQueueFromVenueID(venueId) {
    return sqlQueryManyResults/* sql */`
    SELECT * FROM song_requests
    WHERE venue = ${venueId}
    `;
}

async function getVenueByName(venue_name) {
    return sqlQuery/* sql */`
    SELECT * FROM jukebox_venue
    WHERE venue_name = ${venue_name}
    `;
}

async function getAllVenues(venue_name) {
    return sqlQueryManyResults/* sql */`
    SELECT * FROM jukebox_venue
    `;
}

/**
 * @arg {{id: string, venue_name: string, venue_location: string}} venue
 */
async function createVenue(venue) {
    return sqlQuery/* sql */`
    INSERT INTO jukebox_venue (
        venue_name
    )
    VALUES (
        ${venue.venue_name}
    )
    `;
}

/**
 * @arg {{id: string}} venue
 * @arg {{id: string}} song
 * @arg {{id: string}} user
 */
async function addQueueItem(venue, song, user) {
    return sqlQuery/* sql */`
    INSERT INTO song_requests (
        song_id,
        user_id,
        venue
    )
    VALUES (
        ${song.id},
        ${user.id},
        ${venue.id}
    )
    `;
}

/**
 * @arg {string} song_request_id
 */
async function deleteQueueItem(song_request_id) {
    return sqlQuery/* sql */`
    DELETE song_requests
    WHERE id = ${song_request_id}
    `;
}

/**
 * @arg {string} venue_id
 */
 async function deleteVenue(venue_id) {
     return sqlQuery/* sql */`
    DELETE song_requests
    WHERE venue = ${venue_id}

    DELETE jukebox_venue
    WHERE id = ${venue_id}
    `;
}

/** SQL Query */
function findUserById(id) {
    return sqlQuery/* sql */`
    SELECT * FROM users
    WHERE id = ${id}
    `;
}

/** passport (authentication and authorization) */
passport.serializeUser(function(user, done) {
  done(null, user?.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = await findUserById(id);
        done(null, user);
    } catch (err) {
        console.error(err);
        done(new Error("Auth Error: Couldn't deserialize user from DB"));
    }
});

/** Spotify Passport (for authentication and authorization through spotify) */
passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.SPOTIFY_CALLBACK_URL,
      passReqToCallback: true,
    },
    async function(req, accessToken, refreshToken, expires_in, profile, done) {
        try {
            req.session.accessToken = accessToken;
            req.session.refreshToken = refreshToken;
            // We use the spotify api docs for profile to find the value https://developer.spotify.com/documentation/web-api/reference/#/operations/get-users-profile
            let user = await findUserBySpotifyId(profile.id);
            
            if (!user) {
                await sqlQuery/* sql */`
                INSERT INTO users (
                    spotify_id,
                    username,
                    photo
                )
                VALUES (
                    ${profile.id},
                    ${profile.displayName},
                    ${profile.photos?.[0]?.value}
                )
                `;
                user = await findUserBySpotifyId(profile.id);
            }
            done(null, user)        
        } catch(err) {
            console.error(err);
            done(new Error("Error signing in with Spotify"))
        }      
    }
  )
);

app.use(express.static("public"));
// set the view engine to ejs
app.set('view engine', 'ejs');

// setup passport dependencies
app.use(session({ secret: process.env.SESSION_SECRET }));
app.use(bodyParser.urlencoded({ extended: false }));
// setup passport
app.use(passport.initialize());
app.use(passport.session());

// handle errors
app.use(function(err, req, res, next) {
  console.error(err.message); // Log error message in our server's console
  if (!err.statusCode) err.statusCode = 500; // If err has no specified error code, set error code to 'Internal Server Error (500)'
  res.status(err.statusCode).send(err.message); // All HTTP requests must have a response, so let's send back an error with its status code and message
});



function isLoggedIn(req, res, next) {
    if (!req.user) {
        res.redirect("/login")
        return;
    }
    next();
}

// Render EJS - Sam
app.get("/", isLoggedIn, (req, res) => {
    res.render("index", {
        user: req.user
    });
})

app.get("/logout", isLoggedIn, (req, res) => {
    req.logout();
    res.redirect("/login");
})

// Is this rendering anything? - Sam
// Maybe this was a stub for a track info page
app.get("/track/:id", isLoggedIn, (req, res) => {
    res.render("track");
})

app.get("/venue/create", isLoggedIn, (req, res) => {
    res.render("create_venue");
});

// Gets our user!
app.post(
    '/venue/create',
    isLoggedIn,
    async function (request, response) {
    await createVenue({
            venue_name: request.body.venue_name,
            // venue_location: request.body.venue_location,
        });
        const venue = await getVenueByName(request.body.venue_name);
        response.redirect(`/venue/${venue.id}`)
      }
);


app.get("/venue/:id", isLoggedIn, async (req, res) => {
    const venue = await getVenueByID(req.params.id);
    if (!venue) {
        res.redirect("/");
        return;
    }
    res.render("venue");
})


// Not sure what this does. - Sam
app.get("/login", (req, res) => {
    res.render("login");
})
    
app.get('/auth/spotify', passport.authenticate('spotify'));


// Seems if successful authorization, home is directed, then index is loaded
app.get(
  '/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// nani kore?
// app.get(
//   '/auth/spotify/callback',
//   passport.authenticate('spotify', { failureRedirect: '/login' }),
//   function(req, res) {
//     await sqlQuery/* sql */`
//         INSERTINTO users (
//             spotify_id,
//         username,
//         photo
//     )
//     VALUES (
//         ${profile.id},
//         ${ profile.displayName},
//             ${profile.photos?.[0]?.value}
//         )
//         `;  
//     user = await findUserBySpotifyId(profile.id);
//   }
// );

const APIRouter = express.Router();

// Handles all spotify get requests (it's basically just a proxy to the spotify api along with the credentials our user logged in with!)
// (security measures such as whitelisting / blacklisting url paths or parameters isn't that important as get requests only read and don't write data.)
APIRouter.get(
    '/api/spotify/:path',
    isLoggedIn,
    async function (req, res) {
        if (!req.session.accessToken) {
            throw new Error("Session expired please login again.");
        }
        const result = await got(process.env.SPOTIFY_API_URL + req.params.path, {
            searchParams: req.query,
            headers: {
                'Authorization': 'Bearer ' + req.session.accessToken
            },
            responseType: 'json'
        }).catch(err => {
            res.json({ error: err });
        });
        res.json(result?.body ?? {});
    }
);

// Gets our venue queue!
APIRouter.get(
    '/api/venue',
    isLoggedIn,
    async function (req, res) {
        const venues = await getAllVenues();
        res.json(venues);
    }
);

// Gets our venue queue!
APIRouter.get(
    '/api/venue/:id/queue',
    isLoggedIn,
    async function (req, res) {
        const song_queue = await getQueueFromVenueID(req.params.id);
        res.json(song_queue ?? []);
    }
);


// Adds a song to a venue with id!
APIRouter.post(
    '/api/queue/venue/:id/song/:songId',
    isLoggedIn,
    async function (req, res) {
        const venue = { id: req.params.id };
        const song = { id: req.params.songId };
        const user = req.user;
        await addQueueItem(venue, song, user);
        res.json({success: true});
    }
);

// Adds a song to a venue with id!
APIRouter.delete(
    '/api/queue/:id',
    isLoggedIn,
    async function (req, res) {
        await deleteQueueItem(req.params.id);
        res.json({ success: true });
    }
);

// Adds a song to a venue with id!
APIRouter.delete(
    '/api/venue/:id',
    isLoggedIn,
    async function (req, res) {
        await deleteVenue(req.params.id);
        res.json({ success: true });
    }
);

// Gets our user!
APIRouter.get(
    '/api/me',
    isLoggedIn,
    async function (req, res) {
        res.json(req.user);
    }
);


app.use(APIRouter);


// handle errors
app.use(function (err, req, res, next) {
    console.error(err.message); // Log error message in our server's console
    if (!err.statusCode) err.statusCode = 500; // If err has no specified error code, set error code to 'Internal Server Error (500)'
    res.status(err.statusCode).json({ error: err.message }); // All HTTP requests must have a response, so let's send back an error with its status code and message
});

;(async () => {
    await sql.connect({
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASS,
        database: process.env.MSSQL_DB,
        server: process.env.MSSQL_IP,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        options: {
            encrypt: process.env !== "development", // for azure
            trustServerCertificate: process.env.NODE_ENV === "development"
        },
        port: 1433
    });
    
    const port = process.env.PORT;
    app.listen(port, () => {
        console.log(`🚀 Spotify API example app listening on http://localhost:${port}`)
    });
})();
