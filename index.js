import express from "express";
import { createClient } from "@supabase/supabase-js";

// init express instance
const app = express();

// for creating a supabase client ins tance
const newClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const midLogger = (req, res, next, allRoutes = true) => {
  console.log("middleware triggered for all routes:", allRoutes);
  // middleware succeeded, the route function will be triggered after
  return next();
};

const midBlock = (req, res, next) => {
  // this middleware return a response and not next, the route function will never be triggered after
  return res.send("the middleware blocked the request");
};

const tracking = async (req) => {
  if (req.originalUrl === "/favicon.ico") return;

  const client = newClient();

  const { status, statusText } = await client.from("tracking").insert([
    {
      // the server url triggered
      pathname: req.originalUrl,
      // user ip
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      // user user agent
      user_agent: req.get("user-agent") || null,
    },
  ]);

  // is the previous request at "created" status
  if (status !== 201) throw Error(statusText);
};

// handle all errors
const handleError = async (err, req, res, next) => {
  console.error(err);

  const client = newClient();

  const stack =
    // error contain error.stack key, store the error.stack
    err instanceof Error
      ? err.stack
      : // error is an object, stringify json error and store it
      typeof err === "object"
      ? JSON.stringify(err)
      : // error is already a string, store it
      typeof err === "string"
      ? // error is not an Error, object or string, store an unexpected error
        err
      : "unexpected error type";

  // store error in error table
  await client.from("error").insert([{ stack }]);

  // return request error content
  return res.send("error handled");
};

// serve static files at /public pathname
app.use("/public", express.static("public"));

// this route has no middleware
app.get("/no-middleware", (req, res) => {
  return res.send("no middleware triggered");
});

// global middleware triggered for all routes below this middleware
app.use(midLogger);

// this route triggered only the global middleware because it is declared before this route
app.get("/global-middleware", (req, res) => {
  return res.send("only global middleware triggered");
});

// this route triggered the global and the midBlock middleware
app.get("/middleware", midBlock, (req, res) => {
  // the middleware midBlock always return the response, this return will never be trigger
  return res.send("the middleware doesn't blocked the request");
});

// handle all get routes expect the one already declared at the top like /middleware
app.get(
  "*",
  (req, res, next) => midLogger(req, res, next, false),
  async (req, res, next) => {
    // return next("error");

    // const user = await client.from("user").insert({
    //   username: "mscholz.dev",
    //   password: "susuhe",
    // });
    // console.log(user);

    await tracking(req);

    // return request content
    return res.send("all routes");
  }
);

app.use(handleError);

// init server at a custom port
app.listen(process.env.PORT, () => {
  console.log(`SUPABASE API running at http://127.0.0.1:${process.env.PORT}`);
});
