var Cube8 = require("./src/nodejs");
var Data = require("./SalesData.json");

var Cube = new Cube8(Data)
Cube
    .Dim(function (r) {
        return r[0];
    }, "Product")
    .Dim(function (r) {
        return r[3];
    }, "Delivery")
    .Dim(function (r) {
        return r[5];
    }, "City")
    .Dim(function (r) {
        return r[6];
    }, "State")
    .SetMeasureFx(function (r) {
        return {
            "RecordCount": 1,
            "ItemSold": r[1],
            "Sales": r[2]
        }
    })
    .SetRollupFx(function (a, b) {
        if (a && b) {
            return {
                RecordCount: a.RecordCount + b.RecordCount,
                ItemSold: a.ItemSold + b.ItemSold,
                Sales: a.Sales + b.Sales
            }
        }
        return a ? a : b;
    });    

var X = Cube.GetDimFacts();
console.log(X);
var M = Cube.GetMeasure({
    "City": "Ontario",
    "Product":"Technology"
})

console.log(M);
    