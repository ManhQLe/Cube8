/*
    By Manh Le - 2016
    http://8thdensity.com
    quang.manh@gmail.com
*/


function Cube8(Data) {
    this.Data = Data;
    this.Dims = [];
    this.RollupKey = "Rollup"
    this.RollupFx = function (a, b) {
        return a && b ? a + b : (a ? a : b);
    }
    this.FactComps = {};
}

Cube8.FX = {
    DefCompFx: function (a, b) {
        return a === b;
    },
    DefGroupRowFX: function (name, Fact) {
        return Fact;
    },
    DefGroupColFX: function (name, Fact) {
        return Fact;
    },
    DefFilterNest: function (Tuples, M, d) {
        return true
    },
    DefModNest: function (NestGroup) { }
}

Cube8.IDX = function (A, f, Comfx) {
    var idx;
    return A.every(function (a, i) {
        idx = i;
        return !Comfx(a, f);
    }) ? (A.push(f), A.length - 1) : idx;
}
//Skip N from fx

Cube8.OneLoop = function (Lens, fx) {
    var DimLen = Lens.length;
    var Total = DimLen;
    var Granula = [];
    var Idx = [];
    var i = 0, r, c;
    var k = 1;
    var inc;
    Lens.forEach(function (l, s) {
        Granula.push(k);
        k *= Lens[DimLen - (s + 1)];
        Idx.push(l);
        Total *= l;
    })
    Granula.reverse();
    while (i < Total) {
        r = Math.floor(i / DimLen);
        c = i % DimLen;
        c == 0 ? k = r : 0;
        Idx[c] = Math.floor(k / Granula[c]);
        k = k % Granula[c];
        (c == DimLen - 1) ? (
            inc = fx(Idx, r, Granula),
            i += (inc ? (inc - 1) * DimLen : 0)
        ) : 0;
        i++;

    }
}

Cube8.prototype.Dim = function (fx, Name, CompareFx) {
    CompareFx ? 1 : CompareFx = Cube8.FX.DefCompFx;
    var Dim = {
        "Name": Name
    }
    var I = Cube8.IDX(this.Dims, Dim, function (a, f) {
        return a.Name == f.Name;
    })
    Dim = this.Dims[I];
    Dim.fx = fx;
    Dim.CompFx = this.FactComps[Name] = CompareFx;
    return this;
}

Cube8.prototype.SetRollupFx = function (fx, field) {
    this.RollupKey = field ? field : this.RollupKey;
    this.RollupFx = fx;
    return this;
}

Cube8.prototype.SetMeasureFx = function (fx) {
    this.AggFx = fx;
    return this;
}


//Names:["Dim1","Dim2"]

Cube8.prototype.GetDimFacts = function (Names) {
    var me = this;
    var Facts = {}, A, f;
    var Dims = this.Dims;
    var Dim;
    var Total = this.Data.length, r;
    Cube8.OneLoop([Total, Dims.length], function (Idx) {
        r = me.Data[Idx[0]];
        Dim = Dims[Idx[1]]
        if (!Names || Names.indexOf(Dim.Name) >= 0) {
            A = Facts[Dim.Name] || (Facts[Dim.Name] = []);
            f = Dim.fx(r);
            Cube8.IDX(A, f, Dim.CompFx);
        }
    })

    return Facts;
}


/*
q = {
    "Name": Fact,
    "Name": fx(Fact,Name,record)
}

q = function(Tuple,Measure,r);
*/

Cube8.prototype.GetMeasure = function (q) {
    q ? 1 : q = {};
    var M;
    var me = this;
    var Rollup;
    var Yes = true;
    var Tuple = {};
    var Col = this.Dims.length;
    var i = 0, c, r, f, Filter;
    var Dims = this.Dims;
    var Dim;
    Cube8.OneLoop([this.Data.length, Col], function (Idx) {
        r = me.Data[Idx[0]];
        c = Idx[1];
        Dim = Dims[c];
        Tuple[Dim.Name] = f = Dim.fx(r);
        c == 0 ? Yes = true : 0;
        Filter = q.hasOwnProperty(Dim.Name) ? q[Dim.Name] : undefined;
        Yes &= (q.call || Filter == undefined) ? true : (Filter.call ? Filter(f, Dim.Name, r) : Dim.CompFx(Filter, f));
        if (c == Col - 1) {
            M = me.AggFx(r, Tuple);
            Yes &= q.call ? q(Tuple, M) : true;
            Yes ? Rollup = me.RollupFx(Rollup, M, r) : 1;
        }
        return Yes ? 0 : (Col - c);

    })

    return Rollup;
}

/*{
    dims: ["Dim1","Dim2"];
    rollup:1
    Choosefx:function(Facts,M,d){}
    Modfx;
}*/


Cube8.prototype.NestDim = function (dims, rollup, Choosefx, Modfx) {
    var me = this;
    Choosefx = Choosefx ? Choosefx : Cube8.FX.DefFilterNest;
    Modfx = Modfx ? Modfx : Cube8.FX.DefModNest;

    var DimLookup = {};
    this.Dims.forEach(function (d) {
        if (dims.indexOf(d.Name) >= 0) {
            DimLookup[d.Name] = d;
        }
    })

    var Nest = [], CNest = Nest, tnest, Facts = {};
    var Dim;
    var Dims = this.Dims;
    var ShortBy1 = dims.length - 1;
    var r, c, Measure, d, dimname, Yes;

    Cube8.OneLoop([this.Data.length, dims.length], function (Idx) {
        r = Idx[0]
        c = Idx[1];
        d = me.Data[r];
        Dim = DimLookup[dims[c]];
        if (c == 0) {
            Dims.forEach(function (dim, idx) {
                Facts[dim.Name] = dim.fx(d);
            });
            Measure = me.AggFx(d);
            Yes = Choosefx(Facts, Measure, d);
        }

        if (Yes) {
            tnest = {
                "Fact": Facts[Dim.Name],
                "DimName": Dim.Name,
                "NextDim": c < ShortBy1 ? [] : null,
                "Level": c
            }

            tnest = CNest[Cube8.IDX(CNest, tnest, function (a, f) {
                return Dim.CompFx(a.Fact, f.Fact);
            })];
            rollup ? tnest[me.RollupKey] = me.RollupFx(Measure, tnest[me.RollupKey]) : 1;
            Modfx(tnest);
            CNest = c < ShortBy1 ? tnest.NextDim : Nest;
        }
        else
            return dims.length;
    })

    return Nest;
}




Cube8.DefaultFX = {
    GroupRowFX: function (name, Fact) {
        return Fact;
    },
    GroupColFX: function (name, Fact) {
        return Fact;
    }
}

/*

    RowFx:function(Name,Fact)
*/

Cube8.prototype.Drill = function (Columns, Rows, RowFx, ColFx) {
    RowFx ? 1 : RowFx = Cube8.DefaultFX.GroupRowFX;
    ColFx ? 1 : ColFx = Cube8.DefaultFX.GroupColFX;
    var Tab = {
        "ColumnFacts": [],
        "RowFacts": [],
        "Measures": {},
        "Right": [],
        "Bottom": [],
        "One": null,
        "Get": function (xr, xc) {
            return this.Measures(xr + "." + xc)
        }
    }

    var me = this;
    var Dims = this.Dims;
    var ColumnLen = Dims.length;
    var Dim;
    var Data = this.Data;

    var d, c, r, Fact, dimname, row, cfidx, rfidx, rowfact, colfact, Tuples = {}, Measure;

    function Comp(a, b) {
        Y = true;
        for (var na in b) {
            Y &= me.FactComps[na] ? me.FactComps[na](a[na], b[na]) : (a[na] === a[nb]);
            if (!Y) break;
        }
        return Y;
    }

    Cube8.OneLoop([this.Data.length, ColumnLen], function (Idx) {
        r = Idx[0];
        c = Idx[1];

        d = me.Data[r];
        Dim = Dims[c];

        Fact = Dim.fx(d);
        Tuples[Dim.Name] = Fact;
        c == 0 ? (rowfact = {}, colfact = {}) : 1;

        if (!Columns || Columns.length == 0)
            colfact = { "Column": "Column" }
        else
            if (Columns.indexOf(Dim.Name) >= 0)  //When in columns
                colfact[Dim.Name] = ColFx(Dim.Name, Fact);

        if (!Rows || Rows.length == 0)
            rowfact = { "Row": "Row" }
        else
            Rows.indexOf(Dim.Name) >= 0 ? rowfact[Dim.Name] = RowFx(Dim.Name, Fact) : 1;
        if (c == ColumnLen - 1) {
            cfidx = Cube8.IDX(Tab.ColumnFacts, colfact, Comp);
            Tab.Bottom.length < Tab.ColumnFacts.length ? Tab.Bottom.push(null) : 1;

            rfidx = Cube8.IDX(Tab.RowFacts, rowfact, Comp);
            Tab.Right.length < Tab.RowFacts.length ? Tab.Right.push(null) : 1;

            Measure = me.AggFx(d, Tuples);
            row = rfidx + "." + cfidx;
            Tab.Measures[row] = me.RollupFx(Tab.Measures[row], Measure);

            Tab.Right[rfidx] = me.RollupFx(Tab.Right[rfidx], Measure);
            Tab.Bottom[cfidx] = me.RollupFx(Tab.Bottom[cfidx], Measure);
            Tab.One = me.RollupFx(Tab.One, Measure);
        }
    })


    return Tab;

}

Cube8.prototype.Table = function (ColName, RowName, RowFx, ColFx) {
    return this.Drill([ColName], [RowName], RowFx, ColFx);
}

/*
    ChooseFx: function(Tuples){
    }
*/

Cube8.prototype.Consolidate = function (ToDims, Choosefx) {
    Choosefx ? 1 : Choosefx = function () {
        return true;
    }
    var me = this;
    var Data = this.Data, Facts = [], Identifer = [], NamesIdx = {};
    var NewData = [];
    var Cube = new Cube8(NewData)
        .SetMeasureFx(function (d) {
            return d[ToDims.length];
        })
        .SetRollupFx(this.RollupFx, this.RollupKey);


    var Dims = this.Dims;
    var DimLen = Dims.length;
    var Total = Data.length * DimLen;
    var Lookup = {};
    var i = 0, r, c, d, Tuples, dname, Record, id, agg, Dim;

    Dims.forEach(function (dim, idx) {
        var ix = ToDims.indexOf(dim.Name);
        if (ix >= 0) {
            Cube.Dim(function (re) {
                return re[ix];
            }, dim.Name, me.FactComps[dim.Name]);

            NamesIdx[dim.Name] = ix;
            Identifer.push(0);
            Facts.push([]);
        }
    })

    Cube8.OneLoop([this.Data.length, DimLen], function (Idx) {
        r = Idx[0];
        c = Idx[1];
        d = me.Data[r];
        Dim = Dims[c];
        dname = Dim.Name;
        c == 0 ? (Tuples = {}, Record = new Array(ToDims.length + 1)) : 1;
        Tuples[Dim.Name] = Dim.fx(d);


        if (NamesIdx[dname] != null) {
            Record[NamesIdx[dname]] = Tuples[dname];
            var fidx = Cube8.IDX(Facts[NamesIdx[dname]], Tuples[dname], me.FactComps[dname])
            Identifer[NamesIdx[dname]] = fidx;
        }
        if (c == DimLen - 1) {
            agg = me.AggFx(d, Tuples);
            if (Choosefx(Tuples, agg)) {
                id = Identifer.join(".");
                if (Lookup[id] == null) {
                    Lookup[id] = NewData.length;
                    NewData.push(Record);
                }
                else
                    Record = NewData[Lookup[id]];

                Record[ToDims.length] = me.RollupFx(Record[ToDims.length], agg);
            }
        }
    })

    return Cube;

}




module.exports = Cube8;