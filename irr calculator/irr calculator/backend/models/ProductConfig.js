const mongoose = require('mongoose');

const productConfigSchema = new mongoose.Schema({
    make: String, // Assuming make is nested under manufacturer
    model: String, // Ensure model is included in the schema
    value0: Number,
    value1: Number,
    value2: Number,
    value3: Number,
    value4: Number,
    value5: Number,
    value6: Number,
    value7: Number,
    value8: Number,
    value9: Number,
    value10: Number,
    value11: Number,
    value12: Number,
    value13: Number,
    value14: Number
});

const ProductConfig = mongoose.model('ProductConfig', productConfigSchema);

module.exports = ProductConfig;
