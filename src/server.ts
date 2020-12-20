import express from "express";
import fs from "fs";
// import file from "file"
import path from "path";
import { isWebUri } from "valid-url";
import bodyParser from "body-parser";
import { filterImageFromURL, deleteLocalFiles } from "./util/util";
import { EventEmitter } from "events";

(async () => {
  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;

  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  app.get(
    "/filteredimage",
    async (req: express.Request, res: express.Response) => {
      const imageURL = req.query["image_url"] as string;

      //    1. validate the image_url query
      if (!isWebUri(imageURL))
        return res.status(400).send(`${imageURL} is not a valid url`);

      //    2. call filterImageFromURL(image_url) to filter the image
      const filteredImageURL = await filterImageFromURL(imageURL);
      const filePath = path.resolve(__dirname, filteredImageURL);

      const emitter = new EventEmitter();

      //    3. send the resulting file in the response
      res.status(200).sendFile(filePath, () => {
        emitter.emit("sent");
      });

      emitter.addListener("sent", () => {
        //    4. deletes any files on the server on finish of the response
        fs.unlink(filePath, (err: NodeJS.ErrnoException) => {
          if (!err) return;
          return console.error(err);
        });
      });
    }
  );

  app.get("/", async (__, res: express.Response) => {
    res.send("try GET /filteredimage?image_url={{}}");
  });

  app.listen(port, () => {
    console.log(`server running http://localhost:${port}`);
    console.log(`press CTRL+C to stop server`);
  });
})();
