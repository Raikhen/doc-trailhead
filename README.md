# DOC Trailhead
This is the DOC Trailhead web application!

Interested in contributing? See the [contributions guidelines](CONTRIBUTIONS.md).

## Quick Start
To get started developing, run `npm run i` to install the dependencies and `npm run init-db` to
create the `trailhead.db` file. Then, you can run the server with `npm run dev` and visit it by
navigating your browser to `localhost:8080`.

Development commands:
* `npm i` - install dependencies
* `npm t` - run tests (requires SQLite installation)
* `npm run dev` - run in development mode
* `npm start` - run in production mode (requires `.env` file)
* `npm run init-db` - create a clean version of the database, with a little bit of seed data
* `npm run lint` - run the linter
* `npm run migrate MIGRATION_FP` - run a database migration
* `npm run format` - run the linter in `--fix` mode (might alter the code)

Database commands
* `npm run set-admin` - if using the prebuilt database, this will log the user in as an admin
* `npm run set-leader` - if using the prebuilt database, this will log the user in as trip leader

## Architecture
Trailhead is a NodeJS application. It uses SQLite as a datastore, Express to define routes, Nunjucks
to build HTML views, and HTMX to add interactivity to the webpage.

### Persistence
You can read more about SQLite in the appendix section below, but the main thing to know
about it is that its datastore is a single file, not a separate process. That means the NodeJS
application does all the database "stuff", not a separate application. This has two big implications
for the application:
* It can be run and tested without any other install besides `npm run i`. This substantially
  improves development speed and simplicity.
* Since database requests do not have to make a network hop, it basically removes the performance
  penalty for executing multiple small SQL queries (sometimes called the "[n+1
  problem](https://www.sqlite.org/np1queryprob.html)"). This lets you write more intelligible SQL
  commands, mixed with a little bit of JS. In practice, I use a bunch of small queries and a few
  medium-sized ones.

### Views
This application does not really have a distinction between frontend and backend. The views are
written in an HTML templating language called [Nunjucks](https://mozilla.github.io/nunjucks/). When
the user requests a webpage, the HTML that they receive is built by the templating language at
runtime. The frontend as such is entirely stateless; whatever the user is "allowed" to do in the
application is built into the HTML that is returned from each route.

If you want to be fancy, this is a concept called Hypertext As The Engine of Application State
([HATEOAS](https://htmx.org/essays/hateoas/)). If you don't want to be fancy, think of this way: the
route responds with some HTML that contains links or buttons relevant to the user that requested it.
If the user is allowed to see a trip to hike Cardigan, the HTML will have an
`<a href=/trips/2>Cardigan Hike!</a>` element in it. If they're allowed to signup, it might have a
`<button type=submit>Signup!</button>` element. In this way the stateless hypertext (HTML) is
defining what the user is allowed to do, and Nunjucks make it easy(ish) to mix and match bits of
HTML.

## Deployment
Trailhead is deployed on a DigitalOcean droplet and served behind an NGINX proxy.

## Testing
In order to run the end-to-end tests, Trailhead can be set up in a docker container. You can build
and run it in the same step like this:

```
docker build -t trailhead-test -f ./test/Dockerfile . && docker run trailhead-test
```

If you have an SQLite version > 3.37 installed, you can just run the test suite locally with `npm
run test`. The docker rigamarole is because we use some of the latest SQLite features to run our
test suite, but older versions will be able to run the application just fine.

If you don't already have Docker Desktop installed, and don't want to install it, give
[Colima](https://github.com/abiosoft/colima/) a try.

## Appendix
Here are some useful resources that might help you understand the tech stack better, if you're not
familiar with parts of it:

### Docs
* [Nunjucks Templating](https://mozilla.github.io/nunjucks/templating.html)
* [HTMX Reference](https://htmx.org/reference/)
* [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
* [Quirks, Caveats, and Gotchas In SQLite](https://www.sqlite.org/quirks.html)

### Blogs
* [How To Set Up a Node.js Application for Production on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04) (this is basically the deployment setup)
* [Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite)
* [How Did REST Come To Mean The Opposite Of Rest?](https://htmx.org/essays/how-did-rest-come-to-mean-the-opposite-of-rest/)
