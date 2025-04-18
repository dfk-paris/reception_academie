# Morceaux de reception - Academie Royale de Peinture et Sculpture

The repository contains the source code and data of a web app
[embedded on the DFK Paris website](https://www.dfk-paris.org/en/page/academie-database-3846.html).
The web app is based on the
[DFK frontend library](https://github.com/dfk-paris/frontend).

# Data

All data relevant for the app is contained within the `data/` directory, with
the exception of the actual artwork images. Please contact Markus Castor
(mcastor@dfk-paris.org) for any questions you might have.

The `npm run import` task compiles the data to a set of JSON files for direct
consumption by the app.

# Development

The application consists of a small ruby data munger script and a frontend to be
embedded in virtually any website (static, cms, groupware etc.). Below, we
provide basic instructions on how to get a development environment up and
running.

## Requirements

More recent versions will likely also work, here is what we used during
development

* ruby 3.0
* nodejs v16.19
* imagemagick v7

## Setup

Install required libraries

    bundle install
    npm install

Once this is done, start the frontend development server
with

    npm run dev

so that the frontend is available at http://127.0.0.1:4000.

# Production

To run the application in production, make suitable changes to `.env` and then
run

    npm run build

and then upload the contents of the `public/` directory to a web server of your
choice. Make sure the web server sends the `Access-Control-Allow-Origin: *`
header so that other pages can load the application code and data.

Once that is done, you can integrate the app into your website. Let's say you
uploaded it to https://myapp.example.com, then add the following snippets to
your page:

```html
<!DOCTYPE html>
<html>
  <head>
    ...
  </head>
  <body>
    ...
    <div is="app"></div>
    ...
    <script src="https://myapp.example.com/app.js"></script>
  </body>
</html>
```

The component `app` can be placed anywhere in your page. Be aware that the app
will modify the hash fragment.

# Licenses

This project makes use of the following works:

* https://thenounproject.com/icon/gender-neutral-13777/

