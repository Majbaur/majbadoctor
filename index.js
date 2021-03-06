const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { query } = require('express');
require('dotenv').config();
const app = express();
const port = process.send.PORT || 5000;

//uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tcwmo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'unAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    console.log(decoded) // bar
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
      req.decoded = decoded;
      next();
    }
  });
}



async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('doctors_portal').collection('services');
    const bookingCollection = client.db('doctors_portal').collection('booking');
    const userCollection = client.db('doctors_portal').collection('users');


    //all data get 
    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });


    //all users

    //verifyJWT,        bosate hobe

    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })


    //make an admin verify page
    app.get('/admin/:email', async(req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin});

    })






    //Admin

    //add veryfyJWT,
    app.put('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const requester = req.params.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'});
      }

    })






    //upsert
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })


    app.get('/booking', verifyJWT, async (res, req) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      }
      else {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      // const authorization = req.headersSent.authorization;

    })

    //booking
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });



    //find baki slots/date
    app.get('/available', async (req, res) => {
      const date = req.query.date;


      //1. get all services
      const services = await serviceCollection.find().toArray();


      //2. get all booking from that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      //3. each service ,
      services.forEach(service => {
        //4. find booking for that service

        const serviceBookings = bookings.filter(book => book.treatment === service.name);

        //5. select slots
        const bookedSlots = serviceBookings.map(book => book.slot);

        ////6. select that slots who is not in bookedslots
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        // 7. set available to slots to make it easier
        service.slots = available;

      })





      res.send(services);
    })

  }
  finally {

  }

}
run().catch(console.dir);


//middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Doctor Uncle')
})

app.listen(port, () => {
  console.log(`Doctors app listening on port ${port}`)
})























// const express = require('express');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();
// const { MongoClient, ServerApiVersion } = require('mongodb');

// const app = express();
// const port = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());


// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.twtll.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).send({ message: 'UnAuthorized access' });
//   }
//   const token = authHeader.split(' ')[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//     if (err) {
//       return res.status(403).send({ message: 'Forbidden access' })
//     }
//     req.decoded = decoded;
//     next();
//   });
// }


// async function run() {
//   try {
//     await client.connect();
//     const serviceCollection = client.db('doctors_portal').collection('services');
//     const bookingCollection = client.db('doctors_portal').collection('bookings');
//     const userCollection = client.db('doctors_portal').collection('users');

//     app.get('/service', async (req, res) => {
//       const query = {};
//       const cursor = serviceCollection.find(query);
//       const services = await cursor.toArray();
//       res.send(services);
//     });

//     app.get('/user', verifyJWT, async (req, res) => {
//       const users = await userCollection.find().toArray();
//       res.send(users);
//     });

//     app.get('/admin/:email', async(req, res) =>{
//       const email = req.params.email;
//       const user = await userCollection.findOne({email: email});
//       const isAdmin = user.role === 'admin';
//       res.send({admin: isAdmin})
//     })

//     app.put('/user/admin/:email', verifyJWT, async (req, res) => {
//       const email = req.params.email;
//       const requester = req.decoded.email;
//       const requesterAccount = await userCollection.findOne({ email: requester });
//       if (requesterAccount.role === 'admin') {
//         const filter = { email: email };
//         const updateDoc = {
//           $set: { role: 'admin' },
//         };
//         const result = await userCollection.updateOne(filter, updateDoc);
//         res.send(result);
//       }
//       else{
//         res.status(403).send({message: 'forbidden'});
//       }

//     })

//     app.put('/user/:email', async (req, res) => {
//       const email = req.params.email;
//       const user = req.body;
//       const filter = { email: email };
//       const options = { upsert: true };
//       const updateDoc = {
//         $set: user,
//       };
//       const result = await userCollection.updateOne(filter, updateDoc, options);
//       const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
//       res.send({ result, token });
//     })

//     // Warning: This is not the proper way to query multiple collection.
//     // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
//     app.get('/available', async (req, res) => {
//       const date = req.query.date;

//       // step 1:  get all services
//       const services = await serviceCollection.find().toArray();

//       // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
//       const query = { date: date };
//       const bookings = await bookingCollection.find(query).toArray();

//       // step 3: for each service
//       services.forEach(service => {
//         // step 4: find bookings for that service. output: [{}, {}, {}, {}]
//         const serviceBookings = bookings.filter(book => book.treatment === service.name);
//         // step 5: select slots for the service Bookings: ['', '', '', '']
//         const bookedSlots = serviceBookings.map(book => book.slot);
//         // step 6: select those slots that are not in bookedSlots
//         const available = service.slots.filter(slot => !bookedSlots.includes(slot));
//         //step 7: set available to slots to make it easier
//         service.slots = available;
//       });


//       res.send(services);
//     })

//     /**
//      * API Naming Convention
//      * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
//      * app.get('/booking/:id') // get a specific booking
//      * app.post('/booking') // add a new booking
//      * app.patch('/booking/:id) //
//      * app.put('/booking/:id') // upsert ==> update (if exists) or insert (if doesn't exist)
//      * app.delete('/booking/:id) //
//     */

//     app.get('/booking', verifyJWT, async (req, res) => {
//       const patient = req.query.patient;
//       const decodedEmail = req.decoded.email;
//       if (patient === decodedEmail) {
//         const query = { patient: patient };
//         const bookings = await bookingCollection.find(query).toArray();
//         return res.send(bookings);
//       }
//       else {
//         return res.status(403).send({ message: 'forbidden access' });
//       }
//     })

//     app.post('/booking', async (req, res) => {
//       const booking = req.body;
//       const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
//       const exists = await bookingCollection.findOne(query);
//       if (exists) {
//         return res.send({ success: false, booking: exists })
//       }
//       const result = await bookingCollection.insertOne(booking);
//       return res.send({ success: true, result });
//     })

//   }
//   finally {

//   }
// }

// run().catch(console.dir);


// app.get('/', (req, res) => {
//   res.send('Hello From Doctor Uncle!')
// })

// app.listen(port, () => {
//   console.log(`Doctors App listening on port ${port}`)
// })

