# Cube8
OLAP Cube tool for JavaScript

This useful tool helps JavaScript developers perform transformation on JSON data quickly through many flexible data operation such as drilling, grouping, slice data on different dimensions. Data after transformation can be used for custom HTML Pivot or charts.

## Installation
>npm i cube8

## Versions
**Cube8.3** Original version on Github. [Tutorial](http://www.8thdensity.com/Cube8/Html8Full)

**Cube8.4** Updated version of **Cube8.3**
- No longer store rollup result in cache. Every query will be computed directly from datasource
- Update Drill function to now allow drilling two or more dimension

Data sample can be downloaded: [HomeSales.json](http://www.8thdensity.com/Resources/SampleData/HomeSales.json)

### Quick Example
```javascript
          Cube = new Cube8(HomeSales.json)
          .Dim(function (d) {
              return d[1];
          }, "City")
          .Dim(function (d) {
              return d[4]
          }, "Beds")
          .Dim(function (d) {
              return d[5]
          }, "Baths")
          .Dim(function (d) {
              return d[7];
          }, "Type")
          .Dim(function (d) {
              return moment(new Date(d[8])).startOf("month").format("MM/DD/YYYY");
          }, "Month")
          .Dim(function (d) {
              return new Date(d[8]).getFullYear();
          }, "Year")
          .SetMeasureFx(function (d) {
               return {
                   "Sales": d[9],
                   "Count": 1
               }
           })
          .SetRollupFx(function (a, b) {
              if (a && b) {
                  return {
                      "Sales": a.Sales + b.Sales,
                      "Count": a.Count + b.Count
                  }
              }
              return a ? a : b;
          })


          var Measure = Cube.GetMeasure({
              "Type":"Residential"
          })
          console.log(Measure);
          console.log(Cube.NestDim(["Year", "Type"], 1))

          console.log(Cube.Drill(["Year"], ["Type"], null, function (dim, Fact) {
              return [2013, 2014].indexOf(Fact) >= 0 ? "13-14 Dual" : Fact;
          }))

          //Consolidate to 2 dimension cube
          var Cube2 = Cube.Consolidate(["Year", "City"]);
          var M = Cube2.GetMeasure({
              "Year": 2016
          });
          console.log(M);
```

## Documentations (8.v4)
### Table Of Content
1. Quick Start
2. GetMeasure
3. One
4. NestDim
5. Tabular
6. Drill

#### Quick Start
>In the following example we will look at a simple cube with 2 dimensions. We will then show how Cube programming *model* can be used to extract useful information

```javascript
var DataSample = [
    ["Apple","US",2,3],
    ["Orange","Canada",4,4],
    ["Apple","UK",9,13.5],
    ["Kiwi","Canada",3,6],
    ["Orange","UK",5,5],
    ["Orange","US",4,4],
    ["Kiwi","US",3,6],
    ["Banana","US",2,2],
    ["Kiwi","UK",2,4],
    ["Apple","US",7,10.5],
    ["Apple","UK",4,6],
    ["Kiwi","Canada",2,4],
    ["Kiwi","US",6,12],
    ["Banana","Canada",5,5],
    ["Banana","US",4,4],
    ["Mango","UK",3,7.5],
    ["Mango","Canada",7,17.5],
    ["Mango","Canada",9,22.5],
    ["Banana","US",7,7],
    ["Banana","UK",8,8]
]

//Need to construct cube first

var MyCube =  new Cube8(DataSample) //Instantiate Cube
.Dim(function (d) { 
    return d[1]
}, "Country")  // Create a dimension named Country and an accessor of how to get the fact
.Dim(function (d) {
    return d[0];
}, "Fruit")    // Create a dimension named Fruit and an accessor of how to get the fact              
.SetMeasureFx(function (d) {
     return {
         "Sales": d[3],
         "Quantity": d[2],
         "RecordCount":1
     }
 }) // Specify the accessor function on how to extract measure/aggregates
.SetRollupFx(function (a, b) {
    if (a && b) {
        return {
            "Sales": a.Sales + b.Sales,
            "Quantity": a.Quantity + b.Quantity,
            "RecordCount":a.RecordCount + b.RecordCount
        }
    }
    return a ? a : b;
}) // Specify how the cube would rollup our aggregates. In this case, our rollup function perform summation.

//Now it is time to get some useful data.

var Total = Cube.One() //Get total of everything
var ForUS = Cube.GetMeasure({"Country":"US"}); // Get Measure for US country
var ByFruitThenCountry = Cube.NestDim(["Fruit","Country"],1); //Create TreeGroup by nesting 2 dimensions
var Table = Cube.Drill(["Country"],["Fruit"]); // 2 Dimension tabular table with Countr as column and Fruit as row

```

#### GetMeasure
```javascript
Cube8.prototye.GetMeasure(q) // GetMeasure 
/*
q is the filter. Three cases:
1. q ==null || q == undefined  --> Rollup everything
2. q = {"DimName": "Fact" } // Rollup only Fact in specify Dimension
3. q = function(Facts, Measure) { //Custom filter
           Facts --> {"Dim1":"Fact","Dim2":"Fact".... } 
           Measure --> Measure of current tuple;
           return true/false --> True = Include ; False = No do not include in the measure rollup
       } 
*/
```

#### One
```javascript
Cube8.prototye.One() - Return the total rollup.
Equivalent call : Cube.GetMeasure();
```

#### NestDim
```javascript
Cube8.prototye.NestDim(Dims,DoRollup,Choosefx,Modfx) - Return nesting in tree form.
/*
    - Dims: Array of Dimension names to be nested.
    - DoRollup: Yes/No --> Include rollup in each node of the tree.
    - Choosefx: Optional custom filter function to determine which fact should be included in the tree
        + Choosefxc: function (Facts, Measure, d) { return true/false } 
        + Facts: {"Dim1":"Fact","Dim2":"Fact".... } 
        + Measure: Current measure of Facts
        + d: Original record from Datatable
    - Modfx: function(Node){  }  //Optional modification fx for altering or adding extra data to tree node.
    
*/
```

#### Table
```javascript
Cube8.prototye.Table(Col,Row,RowFx,ColFx) - Return tabular table with one dimension as column and one dimension as Row
/*
    Col - String: Specify dimension name as column
    Row - String: Specify dimension name as row
    RowFx: function(dimname,Fact) { return custom object as group of multuple facts } optional
    ColFx: function(dimname,Fact) { return custom object as group of multuple facts}  optional

*/
```

#### Drill
```javascript
Cube8.prototye.Drill(Cols,Rows,RowFx,ColFx) - Return tabular table with one dimension as column and one dimension as Row
/*
    Cols - Array: Specify dimensions names as columns
    Rows - Array: Specify dimensions names as rows
    RowFx: function(dimname,Fact) { return custom object as group of multuple facts } optional
    ColFx: function(dimname,Fact) { return custom object as group of multuple facts}  optional

*/
```


## Next updates
>Multi tables and relationship.

## Author
Manh Le
## Contributions
Welcome
## License
It is free to use it on any project, any type of project. Have fun.
