require("dotenv").config();

const express = require("express");

const app = express();
const morgan = require("morgan");

const cors = require("cors");

const Contact = require("./mongo");

app.use(express.json());

app.use(cors());

app.use(express.static("build"));

morgan.token("data", function getData(req) {
  if (req.method === "POST") {
    return JSON.stringify(req.body);
  }
  return "";
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :data")
);

app.get("/info", (request, response, next) => {
  Contact.find({})
    .then((contacts) => {
      response.send(
        `<p>Phonebook has info for ${
          contacts.length
        } people<p><p>${new Date()}<p>`
      );
    })
    .catch((error) => next(error));
});

app.get("/api/persons", (request, response, next) => {
  Contact.find({})
    .then((contacts) => {
      response.json(contacts);
    })
    .catch((error) => next(error));
});

app.get("/api/persons/:id", (request, response, next) => {
  const id = request.params.id;

  Contact.findById(id)
    .then((contact) => {
      if (contact) {
        response.json(contact);
      } else {
        response.status(404).json({
          error: "content not found",
        });
      }
    })
    .catch((error) => next(error));
});

app.delete("/api/persons/:id", (request, response, next) => {
  Contact.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.put("/api/persons/:id", (request, response, next) => {
  const body = request.body;
  if (!body) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  if (!body.name || !body.number) {
    return response.status(400).json({
      error: "name or number is missing",
    });
  }

  const contact = {
    name: body.name,
    number: body.number,
  };

  Contact.findByIdAndUpdate(request.params.id, contact, {
    new: true,
    runValidators: true,
    context: "query",
  })
    .then((updatedContact) => {
      console.log("put resp ", updatedContact);
      response.json(updatedContact);
    })
    .catch((error) => next(error));
});

app.post("/api/persons", (request, response, next) => {
  const body = request.body;
  if (!body) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  if (!body.name || !body.number) {
    return response.status(400).json({
      error: "name or number is missing",
    });
  }

  Contact.find({})
    .then((contacts) => {
      const present = contacts.filter((val) => val.name === body.name);
      if (present.length) {
        return response.status(400).json({
          error: "name must be unique",
        });
      }
    })
    .catch((error) => next(error));

  const contact = new Contact({
    name: body.name,
    number: body.number,
    date: new Date(),
  });

  contact
    .save()
    .then((savedContact) => {
      response.json(savedContact);
    })
    .catch((error) => next(error));
});

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

// handler of requests with unknown endpoint
app.use(unknownEndpoint);

const errorHandler = (error, request, response, next) => {
  console.error(error);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  response.status(500).send({ error: "error" });
  next();
};

// handler of requests with result to errors
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
