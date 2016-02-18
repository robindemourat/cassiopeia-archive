Cassiopeia (archive version)
============

# [Check it out](https://cassiopeiapp.herokuapp.com)

Cassiopeia aims at visualizing and navigating into a twitter feed related to a specific query, and to follow the activity of the twitter accounts involved in the conversation, each represented by a constellation of visual objects. You can navigate into the twitter feed's history by brushing the histograms presented below the main visualization. Specific tweets analysis are allowed by the possibility to color tweets and users related to specific keywords or regular expressions.

It comes in several versions :
* archive, static file-based (this one)
* event-oriented, live-feed visualization (cassiopeia-tdn)
* read-only live-feed app, purposed for embedding (cassiopeia-client)

# Tech

Cassiopeia-archive is scaffolded with yeoman-angular-fullstack generator.
For this long-term, lightweight version, data is contained in simple json files being loaded and processed by the server.

Front-end uses angular & d3.

# API

Cors enabled, enjoy.

```
GET api/globaltimeline
```


```
GET /api/slice/:from/:to/:colors?
```

# Reproduce

### Requirements

* install [node and npm](https://nodejs.org/en/)
* install [yeoman](http://yeoman.io/) - npm install -g yo

Or if you don't want to install yeoman :
* install [Grunt](http://gruntjs.com/) - npm install -g grunt-cli
* install [bower](http://bower.io/) - npm install -g bower

### Installation

Download and unpack the repo, open a terminal and cd to its root directory, then :
```
npm install -u
bower install -u
```

That's it !

## Usage

Development :
```
grunt serve
```

Production :
```
grunt build
cd dist
```


## note on data

From this repo the json file containing the array of tweets is substracted.

If you'd want to reuse the app, here is what a tweet must look like in your json file;
```
{
    created_at : (string)(date),
    created_at_abs : (number)(abs date of the tweet creation),
    id : (number),
    text : (string),
    lang : (string),
    in_reply_to_status_id : (number),
    in_reply_to_user_id : (number),

    user_id : (number),
    user_screen_name : (string),
    profile_image_url : (string),
    user_name : (string),
    coordinates : (array),
    url : (string),
}
```

# About

Designed and developped by Robin de Mourat (Université Rennes 2) and Donato Ricci (Sciences Po Paris) with the help of Benjamin Ooghe-Tabanou and his incredible [gazouilloire](https://github.com/medialab/gazouilloire) for tweets retrieving.

Cassiopeia was first tested in May 2015  during the event ["make it work"](http://www.nanterre-amandiers.com/2014-2015/make-it-work-le-theatre-des-negociations/), a huge-scale students' simulation of the climate negociation that have been held in Paris some months later.

Cassiopeia is the little sister of a former experiment named [Andromeda](http://www.densitydesign.org/research/andromeda-twitterwall/) and made with [Michele Mauri](http://www.densitydesign.org/person/michele-mauri) and [Valerio Pellegrini](https://www.behance.net/valeriopellegrini).
