
const express = require('express');
const app = express();
const SquareConnect = require('square-connect');
const {
  PaymentsApi,
  OrdersApi,
  LocationsApi,
  CustomersApi,
  CreateCustomerCardRequest
} = require('square-connect');
const defaultClient = SquareConnect.ApiClient.instance;
const crypto = require('crypto');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let oauth2 = defaultClient.authentications['oauth2'];
oauth2.accessToken = "EAAAEFiBm0elvNX-rgwb12HgTqjYcSJfm3kmkaELy9a-REO-bfeLq6YsuiAWzBqW" //process.env.ACCESS_TOKEN;

// Use API_BASE_PATH to switch between sandbox env and production env
// sandbox: https://connect.squareupsandbox.com
// production: https://connect.squareup.com
defaultClient.basePath = "https://connect.squareupsandbox.com" //process.env.API_BASE_PATH;


const paymentsApi = new PaymentsApi();
const ordersApi = new OrdersApi();
const locationsApi = new LocationsApi();
const customersApi = new CustomersApi();

app.post('/bookappointment', async (request, response) => {
  const requestBody = request.body;
  console.log(requestBody);
  const createOrderRequest = getOrderRequest();

  try {
    const locations = await locationsApi.listLocations();
    const locationId = locations.locations[0].id;
    // const order = await ordersApi.createOrder(locationId, createOrderRequest);

    const createPaymentRequest = {
      "idempotency_key": crypto.randomBytes(12).toString('hex'),
      "source_id": requestBody.nonce,
      "amount_money": {
        // ...order.order.total_money,
          amount: requestBody.amount,
        currency: requestBody.currency
      },
      // "order_id": order.order.id,
      "autocomplete": true,
    };
    console.log(createPaymentRequest);
    const createPaymentResponse = await paymentsApi.createPayment(createPaymentRequest);
    console.log(createPaymentResponse.payment);

    response.status(200).json(createPaymentResponse.payment);
  } catch (e) {
    delete e.response.req.headers;
    delete e.response.req._headers;
    console.log(
      `[Error] Status:${e.status}, Messages: ${JSON.stringify((JSON.parse(e.response.text)).errors, null, 2)}`);

    const { errors } = (JSON.parse(e.response.text));
    sendErrorMessage(errors, response);
  }
});

app.post('/createcustomer', async (request, response) => {
  const requestBody = request.body;
  console.log(requestBody);
  try {
    const customer = new SquareConnect.CreateCustomerRequest({
      reference_id:requestBody.reference_id,
      phone_number:requestBody.phone_number,
    });
    console.log(body);
    const customerResponse = await customersApi.createCustomer(customer);
    console.log(customerResponse.customer);

    response.status(200).json(customerResponse);
  } catch (e) {
    console.log(e);
    delete e.response.req.headers;
    delete e.response.req._headers;
    console.log(
      `[Error] Status:${e.status}, Messages: ${JSON.stringify((JSON.parse(e.response.text)).errors, null, 2)}`);

    const { errors } = (JSON.parse(e.response.text));
    sendErrorMessage(errors, response);
  }
});


app.post('/createCustomerCard', async (request, response) => {
  const requestBody = request.body;
  console.log(requestBody);
  try {
    const body = new CreateCustomerCardRequest(requestBody.nonce);
    console.log(body);
    const customerCardResponse = await customersApi.createCustomerCard(requestBody.customer_id, body);
    console.log(customerCardResponse.card);

    response.status(200).json(customerCardResponse.card);
  } catch (e) {
    delete e.response.req.headers;
    delete e.response.req._headers;
    console.log(
      `[Error] Status:${e.status}, Messages: ${JSON.stringify((JSON.parse(e.response.text)).errors, null, 2)}`);

    const { errors } = (JSON.parse(e.response.text));
    sendErrorMessage(errors, response);
  }
});

function getOrderRequest() {
  return {
    "idempotency_key": crypto.randomBytes(12).toString('hex'),
      order: {
      line_items: [
        {
          name: "Cookie",
          quantity: "1",
          base_price_money: {
            amount: 100,
            currency: "AUD"
          }
        }
      ]
    }
  }
}

function sendErrorMessage(errors, response) {
  switch (errors[0].code) {
    case "UNAUTHORIZED":
      response.status(401).send({
          errorMessage: "Server Not Authorized. Please check your server permission."
      });
      break;
    case "GENERIC_DECLINE":
      response.status(400).send({
          errorMessage: "Card declined. Please re-enter card information."
      });
      break;
    case "CVV_FAILURE":
      response.status(400).send({
          errorMessage: "Invalid CVV. Please re-enter card information."
      });
      break;
    case "ADDRESS_VERIFICATION_FAILURE":
      response.status(400).send({
          errorMessage: "Invalid Postal Code. Please re-enter card information."
      });
      break;
    case "EXPIRATION_FAILURE":
      response.status(400).send({
          errorMessage: "Invalid expiration date. Please re-enter card information."
      });
      break;
    case "INSUFFICIENT_FUNDS":
      response.status(400).send({
          errorMessage: "Insufficient funds; Please try re-entering card details."
      });
      break;
    case "CARD_NOT_SUPPORTED":
      response.status(400).send({
          errorMessage: "	The card is not supported either in the geographic region or by the MCC; Please try re-entering card details."
      });
      break;
    case "PAYMENT_LIMIT_EXCEEDED":
      response.status(400).send({
          errorMessage: "Processing limit for this merchant; Please try re-entering card details."
      });
      break;
    case "TEMPORARY_ERROR":
      response.status(500).send({
          errorMessage: "Unknown temporary error; please try again;"
      });
      break;
    default:
      response.status(400).send({
          errorMessage: "Payment error. Please contact support if issue persists."
      });
      break;
  }
}

// listen for requests :)
// const listener = app.listen(process.env.PORT, function () {
const listener = app.listen(3000, function () {

  console.log('Your app is listening on port ' + listener.address().port);
});
