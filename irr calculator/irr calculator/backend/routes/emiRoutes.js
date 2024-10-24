const express = require('express');
const router = express.Router();
const axios = require('axios');
const ProductConfig = require('../models/ProductConfig');
const Vehicle = require('../models/Vehicle');
require('dotenv').config();

// EMI calculation function
const calculateEMI = (loanAmount, annualInterestRate, tenureInMonths) => {
  const monthlyInterestRate = annualInterestRate / (12 * 100);
  const numerator = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths);
  const denominator = Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1;
  return numerator / denominator;
};

// Function to calculate IRR
const irr = (cashFlows, guess = 0.1) => {
  const tol = 1e-6;
  const maxIter = 1000;
  let x0 = guess;
  for (let i = 0; i < maxIter; i++) {
    const npv = cashFlows.reduce((acc, val, j) => acc + val / Math.pow(1 + x0, j), 0);
    const d_npv = cashFlows.reduce((acc, val, j) => acc - j * val / Math.pow(1 + x0, j + 1), 0);
    const x1 = x0 - npv / d_npv;
    if (Math.abs(x1 - x0) < tol) return x1;
    x0 = x1;
  }
  return x0;
};

// Route to calculate EMI, DSA Payout, and Net IRR
router.post('/calculate-emi', (req, res) => {
  const { loanAmount, grossIRR, tenure, dsaPayoutPercent } = req.body;

  if (!loanAmount || !grossIRR || !tenure || dsaPayoutPercent === undefined) {
    return res.status(400).json({ message: "One of the required fields is missing" });
  }

  const emi = calculateEMI(loanAmount, grossIRR, tenure);
  const dsaPayout = (loanAmount * dsaPayoutPercent / 100).toFixed(2);

  // Calculate net cash flows
  const netCashFlows = [-loanAmount];
  for (let i = 0; i < tenure; i++) {
    netCashFlows.push(emi);
  }

  // Calculate Net IRR
  const netIrr = irr(netCashFlows) * 100;

  res.status(200).json({ emi: emi.toFixed(2), dsaPayout, netIrr: netIrr.toFixed(2) });
});

// New route to get asset makes
router.get('/asset-makes', async (req, res) => {
  try {
    const makes = await ProductConfig.distinct('make');
    res.status(200).json(makes);
  } catch (error) {
    console.error('Error fetching asset makes:', error);
    res.status(500).json({ message: "Error fetching asset makes", error: error.message });
  }
});

router.get('/asset-models', async (req, res) => {
  const { make } = req.query;
  try {
    const models = await ProductConfig.distinct('model', { 'make': make });
    res.status(200).json(models);
  } catch (error) {
    console.error(`Error fetching asset models for make ${make}:`, error);
    res.status(500).json({ message: `Error fetching asset models for make ${make}`, error: error.message });
  }
});

// New route to get grid amount
router.post('/grid-amount', async (req, res) => {
  const { make, model, yearOfManufacture } = req.body;

  if (!make || !model || !yearOfManufacture) {
    return res.status(400).json({ message: "Make, Model, and Year of Manufacture are required" });
  }

  try {
    const product = await ProductConfig.findOne({ make: make, model: model });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - yearOfManufacture;

    if (yearsAgo < 0 || yearsAgo > 14) {
      return res.status(400).json({ message: "Invalid year of manufacture" });
    }

    const gridAmount = product[`value${yearsAgo}`];

    res.status(200).json({ gridAmount });
  } catch (error) {
    console.error('Error fetching grid amount:', error);
    res.status(500).json({ message: "Error fetching grid amount", error: error.message });
  }
});

// Route to fetch vehicle details based on rcNumber
router.post('/fetch-vehicle-details', async (req, res) => {
  console.log("entered fetch details",req.body);
  try {
    const apiUrl = 'https://test.zoop.one/api/v1/in/vehicle/rc/advance';

    const requestData = {
      "mode": "sync",
      "data": {
        "vehicle_registration_number": req.body.rcNumber, // Use the rcNumber from the request body
        "consent": "Y",
        "consent_text": "I hear by declare my consent agreement for fetching my information via ZOOP API."
      },
      "task_id": "e5d5196a-1c1c-4496-a2a4-33672bbbd8e2111"
    };

    const headers = {
      "api-key": 'V24VJHA-R2ZM02G-J870BKY-0BJ05Q1',
      'Content-Type': 'application/json',
      "app-id": '6385ee202835aa001da652b6',
    };

    // Make POST request to the API
    const response = await axios.post(apiUrl, requestData, { headers });
    console.log("response >>>>", response.data);
    // Handle API response
    res.json(response.data); // Send the response data back to the client
  } catch (error) {
    console.error('Error fetching data from API:', error);
    res.status(error.response?.status || 500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;