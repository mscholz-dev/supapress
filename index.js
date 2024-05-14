import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();

const newClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

app.get("*", async (req, res) => {
  const client = newClient();

  try {
    // const user = await client.from("user").insert({
    //   username: "mscholz.dev",
    //   password: "susuhe",
    // });
    // console.log(user);

    await tracking(req, client);
  } catch (err) {
    console.error(err);

    if (client) {
      const stack =
        err instanceof Error
          ? err.stack
          : typeof err === "object"
          ? JSON.stringify(err)
          : typeof err === "string"
          ? err
          : "unexpected error type";

      await client.from("error").insert([{ stack }]);
    }
  }

  return res.send("user created");
});

const tracking = async (req, client) => {
  if (!client) throw Error("client is not defined");

  const { status, statusText } = await client.from("tracking").insert([
    {
      pathname: req.originalUrl,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      user_agent: req.get("user-agent"),
    },
  ]);

  if (status !== 201) throw Error(statusText);
};

app.listen(process.env.PORT, () => {
  console.log(`SUPABASE API running at http://127.0.0.1:${process.env.PORT}`);
});
