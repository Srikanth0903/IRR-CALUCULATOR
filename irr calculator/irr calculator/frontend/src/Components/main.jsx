import React, { useState, useEffect } from "react";
import axios from "axios";
import "./main.css";

const Modal = ({ visible, onClose, vehicleDetails }) => {
  if (!visible) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h2>Vehicle Details</h2>
        <pre>{JSON.stringify(vehicleDetails, null, 2)}</pre>
      </div>
    </div>
  );
};

const IRRCalculator = () => {
  const [formData, setFormData] = useState({
    loanAmount: "",
    frequency: "Monthly",
    loanPeriodYears: "",
    loanPeriodMonths: "",
    tenure: "",
    payableIn: "",
    installments: "",
    advanceEMI: "0",
    moratorium: "0",
    grossIRR: "",
    dsaPayoutPercent: "",
    dsaPayout: "",
    subvention: "0",
    emi: "",
    netIRR: "",
    assetMake: "",
    assetModel: "",
    yearOfManufacture: "",
    rcNumber: "", // Added RC Number state
  });

  const [errors, setErrors] = useState({});
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [gridAmount, setGridAmount] = useState("");
  const [assetMakes, setAssetMakes] = useState([]);
  const [assetModels, setAssetModels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Fetch asset makes when component mounts
    axios
      .get("http://localhost:5000/api/asset-makes") // Replace with your backend URL
      .then((response) => {
        setAssetMakes(response.data); // Assuming response.data is an array of makes
      })
      .catch((error) => {
        console.error("Error fetching asset makes:", error);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Prevent negative values
    if (parseFloat(value) < 0 && value !== "") {
      setErrors({ ...errors, [name]: "Value cannot be negative" });
      return;
    }

    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });

    // Fetch asset models when assetMake changes
    if (name === "assetMake") {
      fetchAssetModels(value);
    }
  };

  const handleFocus = () => {
    setErrors({});
  };

  const handleBlur = async (e) => {
    const rcNumber = e.target.value;
    if (!rcNumber.trim()) {
      setVehicleDetails(null);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/fetch-vehicle-details",
        { rcNumber }
      );

      if (response.data) {
        setVehicleDetails(response.data);
      } else {
        setVehicleDetails(null);
      }
    } catch (error) {
      console.error("Error calling RC Number API:", error);
      setVehicleDetails(null);
    }
  };

  const handleView = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const fetchAssetModels = (make) => {
    axios
      .get(`http://localhost:5000/api/asset-models?make=${make}`)
      .then((response) => {
        setAssetModels(response.data); // Assuming response.data is an array of models
      })
      .catch((error) => {
        console.error(`Error fetching asset models for make ${make}:`, error);
      });
  };

  useEffect(() => {
    const { loanPeriodYears, loanPeriodMonths } = formData;
    let tenureMonths = 0;

    if (loanPeriodYears) {
      tenureMonths += parseInt(loanPeriodYears) * 12;
    }
    if (loanPeriodMonths) {
      tenureMonths += parseInt(loanPeriodMonths);
    }

    setFormData((prevData) => ({
      ...prevData,
      tenure: tenureMonths,
      payableIn: tenureMonths,
      installments: tenureMonths,
    }));
  }, [formData.loanPeriodYears, formData.loanPeriodMonths]);

  const calculateEMI = () => {
    const newErrors = {};
    if (!formData.loanAmount) newErrors.loanAmount = "Loan Amount is required";
    if (!formData.loanPeriodYears && !formData.loanPeriodMonths)
      newErrors.loanPeriod = "Loan Period is required";
    if (!formData.grossIRR) newErrors.grossIRR = "Gross IRR is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const loanAmount = parseFloat(formData.loanAmount);
    const grossIRR = parseFloat(formData.grossIRR);
    const tenureMonths = parseInt(formData.tenure);
    const dsaPayoutPercent = parseFloat(formData.dsaPayoutPercent);

    if (
      loanAmount &&
      grossIRR &&
      tenureMonths &&
      dsaPayoutPercent !== undefined
    ) {
      // API call to the backend to calculate EMI, DSA Payout, and Net IRR
      axios
        .post("http://localhost:5000/api/calculate-emi", {
          loanAmount: loanAmount,
          grossIRR: grossIRR,
          tenure: tenureMonths,
          dsaPayoutPercent: dsaPayoutPercent,
        })
        .then((response) => {
          const { emi, dsaPayout, netIrr } = response.data;
          setFormData((prevData) => ({
            ...prevData,
            emi: emi,
            dsaPayout: dsaPayout,
            netIRR: netIrr,
          }));
        })
        .catch((error) => {
          console.error("There was an error calculating the EMI:", error);
          setFormData((prevData) => ({
            ...prevData,
            emi: "",
            dsaPayout: "",
            netIRR: "",
          }));
        });
    } else {
      setFormData((prevData) => ({
        ...prevData,
        emi: "",
        dsaPayout: "",
        netIRR: "",
      }));
    }
  };

  const getGridAmount = () => {
    const { assetMake, assetModel, yearOfManufacture } = formData;
    const newErrors = {};

    if (!assetMake) newErrors.assetMake = "Asset Make is required";
    if (!assetModel) newErrors.assetModel = "Asset Model is required";
    if (!yearOfManufacture)
      newErrors.yearOfManufacture = "Year of Manufacture is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    axios
      .post("http://localhost:5000/api/grid-amount", {
        make: assetMake,
        model: assetModel,
        yearOfManufacture: parseInt(yearOfManufacture),
      })
      .then((response) => {
        setGridAmount(response.data.gridAmount);
        console.log("Grid amount:", response.data.gridAmount);
      })
      .catch((error) => {
        console.error("There was an error fetching the grid amount:", error);
        setGridAmount("");
      });
  };

  return (
    <div className="container">
      <div className="main-container">
        <div className="form-container left-container">
          <div className="heading">IRR Calculator</div>
          <div className="form-group3">
            <label>
              Loan Amount<span className="required-field">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="loanAmount"
              value={formData.loanAmount}
              onChange={handleChange}
              onFocus={handleFocus}
              className={errors.loanAmount ? "error" : ""}
            />
          </div>
          {errors.loanAmount && (
            <span className="error-message">{errors.loanAmount}</span>
          )}
          <div className="form-group2">
            <label>Frequency</label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
            >
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group3">
            <label>
              Loan Period<span className="required-field">*</span>
            </label>
            <div className="period-inputs">
              <input
                type="number"
                name="loanPeriodYears"
                value={formData.loanPeriodYears}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.loanPeriod ? "error" : ""}
                min="0"
              />
              <div className="period-text">Year(s)</div>
              <input
                type="number"
                name="loanPeriodMonths"
                value={formData.loanPeriodMonths}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.loanPeriod ? "error" : ""}
                min="0"
              />
              <div className="period-text">Month(s)</div>
            </div>
          </div>
          {errors.loanPeriod && (
            <span className="error-message">{errors.loanPeriod}</span>
          )}
          <div className="form-group2">
            <label>Tenure</label>
            <input
              type="number"
              name="tenure"
              value={formData.tenure}
              onChange={handleChange}
              disabled
            />
          </div>
          <div className="form-group">
            <label>Payable in</label>
            <input
              type="number"
              name="payableIn"
              value={formData.payableIn}
              onChange={handleChange}
              disabled
            />
          </div>
          <div className="form-group">
            <label>Installments</label>
            <input
              type="number"
              name="installments"
              value={formData.installments}
              onChange={handleChange}
              disabled
            />
          </div>
          <div className="form-group5">
            <label>Advance EMI</label>
            <input
              type="number"
              name="advanceEMI"
              value={formData.advanceEMI}
              onChange={handleChange}
              onFocus={handleFocus}
              disabled
              min="0"
            />
          </div>
        </div>

        <div className="form-container right-container">
          <div className="form-group1">
            <label>Moratorium</label>
            <input
              type="number"
              name="moratorium"
              value={formData.moratorium}
              onChange={handleChange}
              onFocus={handleFocus}
              disabled
              min="0"
            />
          </div>
          <div className="form-group3">
            <label>
              Gross IRR%<span className="required-field">*</span>
            </label>
            <input
              type="number"
              name="grossIRR"
              value={formData.grossIRR}
              onChange={handleChange}
              onFocus={handleFocus}
              className={errors.grossIRR ? "error" : ""}
              min="0"
            />
          </div>
          {errors.grossIRR && (
            <span className="error-message">{errors.grossIRR}</span>
          )}
          <div className="form-group2">
            <label>DSA Payout %</label>
            <input
              type="number"
              name="dsaPayoutPercent"
              value={formData.dsaPayoutPercent}
              onChange={handleChange}
              onFocus={handleFocus}
              min="0"
            />
          </div>
          <div className="form-group1">
            <label>DSA Payout</label>
            <input
              type="number"
              name="dsaPayout"
              value={formData.dsaPayout}
              onChange={handleChange}
              disabled
            />
          </div>
          <div className="form-group1">
            <label>Subvention</label>
            <input
              type="number"
              name="subvention"
              value={formData.subvention}
              onChange={handleChange}
              onFocus={handleFocus}
              disabled
              min="0"
            />
          </div>
          <div className="form-group1">
            <label>EMI</label>
            <input
              type="number"
              name="emi"
              value={formData.emi}
              onChange={handleChange}
              disabled
            />
          </div>
          <div className="form-group1">
            <label>Net IRR %</label>
            <input
              type="number"
              name="netIRR"
              value={formData.netIRR}
              onChange={handleChange}
              disabled
            />
          </div>
        </div>

        <div className="button-container">
          <button onClick={calculateEMI}>Calculate</button>
        </div>
      </div>
      <div className="main-container">
        <div className="form-container left-container">
          <div className="heading">Cars</div>
          <div className="form-group2">
            <label>
              RC Number<span className="required-field">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="rcNumber"
              value={formData.rcNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              className={errors.rcNumber ? "error" : ""}
            />
          </div>
          {errors.rcNumber && (
            <span className="error-message">{errors.rcNumber}</span>
          )}
          <div className="button-container">
            <button onClick={handleView}>View</button>
          </div>
        </div>
        <div className="form-container right-container1">
          <div className="form-group2">
            <label>Grid Amount</label>
            <input type="text" value={gridAmount} readOnly />
          </div>
          <div className="button-container">
            <button onClick={getGridAmount} className="calculate-button">
              Get Grid Amount
            </button>
          </div>
        </div>
      </div>
      <div className="main-container">
        <div className="form-container left-container">
          <div className="heading">Vehicles (Other than cars)</div>
          <div className="form-group2">
            <label>
              Asset Make<span className="required-field">*</span>
            </label>
            <select
              name="assetMake"
              value={formData.assetMake}
              onChange={handleChange}
            >
              <option value="">Select a make</option>
              {assetMakes.map((make, index) => (
                <option key={index} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group3">
            <label>
              Year of Manufacture<span className="required-field">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="yearOfManufacture"
              value={formData.yearOfManufacture}
              onChange={handleChange}
              onFocus={handleFocus}
              className={errors.yearOfManufacture ? "error" : ""}
            />
          </div>
          {errors.yearOfManufacture && (
            <span className="error-message">{errors.yearOfManufacture}</span>
          )}
          <div className="button-container">
            <button onClick={getGridAmount} className="calculate-button">
              Get Grid Amount
            </button>
          </div>
        </div>
        <div className="form-container right-container1">
          <div className="form-group2">
            <label>
              Asset Model<span className="required-field">*</span>
            </label>
            <select
              name="assetModel"
              value={formData.assetModel}
              onChange={handleChange}
            >
              <option value="">Select a model</option>
              {assetModels.map((model, index) => (
                <option key={index} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group2">
            <label>Grid Amount</label>
            <input type="text" value={gridAmount} readOnly />
          </div>
        </div>
      </div>
      <Modal
        visible={isModalOpen}
        onClose={handleCloseModal}
        vehicleDetails={vehicleDetails}
      />
    </div>
  );
};

export default IRRCalculator;
