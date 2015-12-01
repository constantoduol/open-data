App.prototype.driverSearch = function(){
    document.title = "Driver Search";
    var area = $("#main_view");
    var html = "<div style='display:flex'>\n\
                 <input type='text' id='id_no' placeholder='id number' style='width:80%' class='form-control'>\n\
                <input type='button' value='Search' class='btn btn-info' id='search_btn'></div>\n\
                <hr><div id='name_area' style='background-color:lightblue;padding:5px;font-size:20px'></div><div id='offense_list'></div>";
    area.html(html);
    $("#search_btn").click(function(){
        var id = $("#id_no").val();
        if(!id){
            app.msg("Id number is required");
            return;
        }
        app.xhr({
            load : true,
            svc : "open_data_2",
            msg : "entity_get",
            data : {
                entities : ["DRIVER_DETAILS","DRIVER_OFFENSES","OFFENSES"],
                limits : [-1,-1,-1]
            },
            success : function(resp){
                var data = resp.response.data;
                console.log(data);
                var driver_details = data.DRIVER_DETAILS;
                var driver_offenses = data.DRIVER_OFFENSES;
                var offenses = data.OFFENSES;
                //get the driver details
                var resp = app.multiJoin([driver_details,driver_offenses,driver_offenses,offenses],
                          ["ID_NUMBER","ID_NUMBER","OFFENSE_ID","OFFENSE_ID"]);
                var r = {};
                var elems = ["FIRST_NAME","LAST_NAME","OFFENSE_ID","OFFENSE_NAME","CATEGORY","JAIL_TERM"]
                for(var x = 0; x < resp.length; x++){
                    if(resp[x].ID_NUMBER === id){
                        for(var y = 0; y < elems.length; y++){
                            if (!r[elems[y]]) {
                                r[elems[y]] = [resp[x][elems[y]]];
                            }
                            else {
                                r[elems[y]].push(resp[x][elems[y]]);
                            }
                        }
                    }
                }
                console.log(r);
                function count(arr, str) {
                    var count = 0;
                    for (var y = 0; y < arr.length; y++) {
                        if (arr[y].toLowerCase() === str.toLowerCase()) {
                            count++;
                        }
                    }
                    return count;
                }
                var blocked = count(r.CATEGORY, "major") > 0 || count(r.CATEGORY, "minor") > 1 ? "Blocked" : "Valid";
                var blockStatus = "<div style='color:red'>" + blocked + "</div>";
                $("#name_area").html(r.FIRST_NAME[0] + " " + r.LAST_NAME[0] + " " + blockStatus);
                $("#offense_list").html("");
                app.ui.table({
                    id_to_append: "offense_list",
                    headers: ["Offense ID", "Offense Name", "Category", "Jail Term"],
                    values: [r.OFFENSE_ID, r.OFFENSE_NAME, r.CATEGORY, r.JAIL_TERM],
                    include_nums: true,
                    style: "",
                    mobile_collapse: true
                });
            }
        });
    });
};

App.prototype.twoWayJoin = function(entitiesOne,entitiesTwo,joinProp1,joinProp2){
    var joined = [];
    var keys1 = Object.keys(entitiesOne);
    var keys2 = Object.keys(entitiesTwo);
    for(var x = 0; x < entitiesOne[joinProp1].length; x++){
        for(var y = 0; y < entitiesTwo[joinProp2].length; y++){
            var elem1 = entitiesOne[joinProp1][x];
            var elem2 = entitiesTwo[joinProp2][y];
            if(elem1 === elem2){
                var obj = {};
                for(var a = 0; a < keys1.length; a++){
                    obj[keys1[a]] = entitiesOne[keys1[a]][x];
                }
                for(var a = 0; a < keys2.length; a++){
                    obj[keys2[a]] = entitiesTwo[keys2[a]][y];
                }
                joined.push(obj);
            }
        }
    }
    return joined;
};

App.prototype.multiJoin = function(entityNames,joinProps){
    var multiJoin = [];
    var allData = [];
    for (var x = 0; x <= entityNames.length / 2; x = x + 2) {
        var twoWayJoin = app.twoWayJoin(entityNames[x], entityNames[x + 1],joinProps[x], joinProps[x + 1]);
        allData.push(twoWayJoin);
    }
    var toJoin1 = [];
    var toJoin2 = [];
    for(var x = 0; x < allData.length; x++){
        var twoWay = allData[x];
        for(var y = 0; y < twoWay.length; y++ ){
            var elem1 = twoWay[y];
            toJoin1.push(elem1);
            if(multiJoin.length < twoWay.length){
                multiJoin.push(elem1);
            }
            else {
                var elem2 = multiJoin[y];
                toJoin2.push(elem2);
                var obj = {};
                var keys1 = Object.keys(elem1);
                var keys2 = Object.keys(elem2);
                for(var a = 0; a < keys1.length; a++){
                    obj[keys1[a]] = elem1[keys1[a]];
                }
                for(var a = 0; a < keys2.length; a++){
                    obj[keys2[a]] = elem2[keys2[a]];
                }
                multiJoin[y] = obj;
            }
        }
    }
    return multiJoin;
};

App.prototype.customInterface = function(){
    var user = localStorage.getItem("current_user");
    if(user === "ndehi"){
        app.driverSearch();
    }
    else if(user === "saipimae"){
        app.lightBulbs();
    }
    else if(user === "muriithi"){
        app.coloredTable();
    }
};

App.prototype.coloredTable = function(){
    document.title = "Sensor Status";
    app.xhr({
        load: true,
        svc: "open_data_2",
        msg: "get",
        data: {
            kind: "SENSOR STATUS"
        },
        success: function (data) {
            var r = data.response.data.get_data;
            app.ui.table({
                id_to_append: "main_view",
                headers: ["Sensor ID", "Status"],
                values: [r["Sensor ID"], r["Sensor Status"]],
                include_nums: false,
                style: "",
                mobile_collapse: true,
                transform : {
                    1 : function(value,index,td){
                        var color = "";
                        if(value === "Low Level Leakage"){
                            color = "yellow";
                        }
                        else if(value === "High Level Leakage"){
                            color = "red";
                        }
                        else if(value === "No Leakage"){
                            color = "green";
                        }
                        td.css("background-color",color);
                    }
                }
            });
        }
    });
};

App.prototype.lightBulbs = function(){
    document.title = "Light bulbs";
    var area = $("#main_view");
    var html = "<div style='display:flex;padding:20px'>\n\
                <div class='circle' id='bulb1'></div>\n\
                <div class='circle' id='bulb2' style='left:300px'></div>\n\
                <div class='circle' id='bulb3' style='left:600px'></div>\n\
                </div>";
    area.html(html);
    setInterval(function(){
        app.xhr({
            load: false,
            svc: "open_data_2",
            msg: "get",
            data: {
                order: "desc",
                limit: 1,
                kind: "Bulbs"
            },
            success: function (data) {
                var r = data.response.data.get_data;
                console.log(r);
                app.switchBulb(r.Status_1[0],"bulb1");
                app.switchBulb(r.Status_2[0],"bulb2");
                app.switchBulb(r.Status_3[0],"bulb3");
            }
        }); 
    },10000);
};

App.prototype.switchBulb = function(status,id){
    status = status.toLowerCase().trim();
    if(status === "on"){
        $("#"+id).css("background-color","yellow");
    }
    else if(status === "off"){
        $("#"+id).css("background-color","black");
    }
};


