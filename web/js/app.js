function App(){
    this.ui = new UI();
    this.reserved = ["timestamp___","kind","id___","api_key"];
    $(document).ready(function(){
        var path = window.location.pathname;
        app.onload.always();
        !app.onload[path] ? null : app.onload[path]();
    });
}

App.prototype.onload = {
    always : function(){
        var modalArea = $("<div id='modal_area'></div>");
        if (!$("#modal_area")[0])
            $("body").append(modalArea); 
    },
    "/main.html" : function(){
        var mainHeight = app.getDim()[1] - 20;
        $(".card").css("height",mainHeight+"px");
        $("#copy_right").css("left",app.getDim()[0]/2.5+"px");
        if (localStorage.getItem("privileges").indexOf("user_service") === -1) {
            $("#users_menu").remove();
        }
        else {
            $("#users_menu").click(function () {
                app.renderView(app.interface.users, "main_view");
            });
        }
        $("#data_menu").click(function () {
            app.fetchUserData();
            $("#main_view").removeClass("handsontable");
            app.renderView(app.interface.data, "main_view");
        });
        
        $("#visual_menu").click(function () {
            app.renderView(app.interface.visual, "main_view");
        });
        app.fetchUserData();
    },
    "/custom.html" : function(){
        var mainHeight = app.getDim()[1] - 20;
        $(".card").css("height", mainHeight + "px");
        $("#copy_right").css("left", app.getDim()[0] / 2.5 + "px");
        app.customInterface();
    }
};


App.prototype.getDim = function () {
    var body = window.document.body;
    var screenHeight;
    var screenWidth;
    if (window.innerHeight) {
        screenHeight = window.innerHeight;
        screenWidth = window.innerWidth;
    }
    else if (body.parentElement.clientHeight) {
        screenHeight = body.parentElement.clientHeight;
        screenWidth = body.parentElement.clientWidth;
    }
    else if (body && body.clientHeight) {
        screenHeight = body.clientHeight;
        screenWidth = body.clientWidth;
    }
    return [screenWidth, screenHeight];
};



App.prototype.renderView = function(obj,id){
    var area = $("#"+id);
    area.html("");
    $.each(obj, function (elem) {
        app.renderDom(obj[elem], area);
    });
};


App.prototype.renderDom = function (obj, toAppend) {
    var elem;
    if (!obj.type)
        return;
    var inputs = ["text", "date", "number", "time", "button","password"];
    var label = $("<label>");
    label.append(obj.label);
    !obj.label ? null : toAppend.append(label);
    if (obj.type === "select") {
        elem = $("<select>");
        $.each(obj.option_names, function (x) {
            var option = $("<option>");
            option.attr("value", obj.option_values[x]);
            option.html(obj.option_names[x]);
            elem.append(option);
        });
    }
    else if (inputs.indexOf(obj.type.trim()) > -1) {
        elem = $("<input type='" + obj.type + "'>");
        elem.val(obj.value);
    }
    else {
        elem = $(obj.type);
        elem.html(obj.html);
    }
    !obj["class"] ? null : elem.addClass(obj["class"]);
    !obj.style ? null : elem.attr("style", obj.style);
    !obj.id ? null : elem.attr("id", obj.id);
    //bind events
    if (obj.events) {
        //do something
        $.each(obj.events, function (event) {
            elem.bind(event, obj.events[event]);
        });
    }
    toAppend.append(elem);
};


App.prototype.xhr = function(options){ 
    var request = {};
    request.request_header = {};
    request.request_header.request_svc = options.svc;
    request.request_header.request_msg = options.msg;
    request.request_header.session_id = localStorage.getItem("ses_id");
    request.request_object = options.data;
    if(options.load){
        if(options.load_area){
            $("#"+options.load_area).html("<img src='img/loader.gif'>");
        }
        else {
            $("#load_area").html("<img src='img/loader.gif'>");
        }
    }
    var defaultOptions = {
        method : "post",
        url : "/server",
        data: "json=" + encodeURIComponent(JSON.stringify(request)),
        dataFilter : function(data){
            if (options.load) {
                if (options.load_area) {
                    $("#" + options.load_area).html("");
                }
                else {
                    $("#load_area").html("");
                }
            }
           var json = JSON.parse(data);
           if(json.request_msg === "auth_required"){
               window.location = "index.html";
           }
           return json;
        }
    };
    defaultOptions.success = options.success;
    defaultOptions.error = options.error;
    return $.ajax(defaultOptions); 
};

App.prototype.briefShow = function (options) {
    var m = app.ui.modal(options.content, options.title, {
    });
    var delay = !options.delay ? 3000 : options.delay;
    app.runLater(delay, function () {
        m.modal('hide');
    });
};

App.prototype.runLater = function (time, func) {
    return setTimeout(func, time);
};

App.prototype.login = function(){
    var email = $("#username").val();
    var pass = $("#password").val();
    if(!email || !pass){
        app.msg("Both username and password are required");
        return;
    }
    app.xhr({
        load : true,
        svc: "open_data_service",
        msg : "login",
        data : {
            username : email,
            password : pass
        },
        success : function(data){
            if (data.response.data.response === "loginsuccess") {
                //get the session id
                localStorage.setItem("ses_id", data.response.data.rand);
                localStorage.setItem("current_user", data.response.data.user);
                localStorage.setItem("privileges", data.response.data.privileges);
                window.location = "main.html";
            }
            else {
                var resp = app_data.login.responses[data.response.data];
                app.briefShow({
                   title : "Login",
                   content : resp,
                   delay : 4000
                });
            }
        }
    });
};

App.prototype.logout = function(){
    app.xhr({
        load: true,
        svc: "open_data_service",
        msg: "logout",
        data: {
            name: localStorage.getItem("current_user")
        },
        success: function (data) {
            if (data.response.data === "success") {
                //get the session id
                localStorage.removeItem("ses_id");
                localStorage.removeItem("current_user");
                localStorage.removeItem("privileges");
                window.location = "index.html";
            }
        },
        error : function(){
           window.location = "index.html"; 
        }
    });
};

App.prototype.fetchUserData = function(){
    app.xhr({
        load: true,
        svc: "open_data_2,open_data_2",
        msg: "all_entities,get_api_key",
        data: {
            name : localStorage.getItem("current_user")
        },
        success: function (data) {
            var r = data.response.open_data_2_all_entities.data;
            app.renderView(app.interface.data, "main_view");
            $("#api_span").html("API Key : "+data.response.open_data_2_get_api_key.data);
            app.ui.table({
                id_to_append: "data_span",
                headers: ["Table Name", "Date Created", "Delete"],
                values: [r.ENTITY_NAME,r.CREATED, r.ENTITY_NAME_FAKE],
                include_nums: true,
                style: "",
                mobile_collapse: true,
                transform : {
                    0 : function(value,index){
                        var fakeName = r.ENTITY_NAME_FAKE[index];
                        return "<a href='#' onclick='app.explodeTable(\""+value+"\",\""+fakeName+"\")'>"+value+"</a>"; 
                    },
                    1 : function(value){
                        return new Date(value).toLocaleString();
                    },
                    2 : function(value){
                        return "<a href='#' onclick='app.deleteTable(\""+value+"\")'>Delete Table</a>"; 
                        
                    }
                }
            });
            
        }
    });
};

App.prototype.deleteTable = function(fakeName){
    var conf = confirm("Deleting this table will cause you to lose all your data in the table,proceed?");
    if(!conf)return;
    app.xhr({
        load: true,
        svc: "open_data_2",
        msg: "delete_table",
        data: {
            fake_name: fakeName
        },
        success: function (data) {
            var r = data.response;
            if (r.data === "success") {
                app.msg("Table deleted successfully");
                $("#data_menu").click();
            }
        }
    });
};

App.prototype.msg = function(content){
    app.briefShow({
        title: "Info",
        content: content,
        delay: 4000
    });  
};

App.prototype.createUser = function(){
    var name = $("#username").val();
    var pass = $("#password").val();
    if(!name || !pass){
        app.msg("Both username and password are required");
        return;
    }
    var conf = confirm("Create User?");
    if (!conf)
        return;
    app.xhr({
        load : true,
        svc: "open_data_2",
        msg: "create_user",
        data :{
            name: name,
            password: pass,
            privs : ["open_data_2"]
        },
       success : function(data){
           var r = data.response;
           if(r.data === "fail"){
               app.msg(r.reason);
           }
           else if(r.data.user_resp === "success") {
               $("#api_span").html("API Key : "+r.data.api_key);
           }
       }
    });
};

App.prototype.deleteUser = function () {
    var name = $("#username").val();
    if (!name) {
        app.msg("username is required");
        return;
    }
    var conf = confirm("Delete User?");
    if (!conf)
        return;
    app.xhr({
        load : true,
        svc: "open_data_2",
        msg: "delete_user",
        data: {
            name: name
        },
        success: function (data) {
            var r = data.response;
            if(r.data === "success"){
                app.msg("User deleted successfully");
            }
            else if(r.data === "fail"){
                app.msg(r.reason);
            }
        }
    });
};

App.prototype.getAPIKey = function(){
    app.xhr({
        load: true,
        svc: "open_data_2",
        msg: "get_api_key",
        data: {
            name: $("#username").val()
        },
        success: function (data) {
            var r = data.response.data;
            $("#api_span").html("API Key : "+r);
        }
    });
};

App.prototype.newEntity = function(){
  //show the view
    app.renderView(app.interface.new_en, "main_view");
  
};

App.prototype.addColumn = function(){
   var input = $("<div class='close_div'>\n\
            <a href='#' class='close' onclick='app.removeColumn(this)'>x</a>\n\
            <input type='text' class='col_names form-control' style='margin-top:10px' placeholder='column name'>\n\
            </div>");
   $("#main_view").append(input);
};

App.prototype.removeColumn = function(elem){
    $(elem).parent().remove();
};


App.prototype.newTable = function(){
    var tname = $("#table_name").val();
    if(!tname){
        app.msg("Please provide a valid name for your table");
        return;
    }
    var cols = $(".col_names");
    var data = {kind : tname};
    for(var x = 0; x < cols.length; x++){
        var value = cols[x].value;
        if(!value){
            app.msg("Invalid name specified for column");
            cols[x].focus();
            return;
        }
        else if(app.reserved.indexOf(value.toLowerCase()) > -1){
            app.msg(value+" is a reserved column name please choose another one");
            return;
        }
        data[value] = ''; 
    }
    if(cols.length === 0 ){
        app.msg("Your table needs at least one column");
        return;  
    }
    
    app.xhr({
        load: true,
        svc: "open_data_2",
        msg: "save",
        data: data,
        success: function (data) {
            var r = data.response.data;
            if(r === "success"){
                app.msg("Table created successfully");
                $("#data_menu").click();
            }
            else {
                app.msg(data.response.reason);
            }
        }
    });
};

App.prototype.explodeTable = function(kind,fakeName){
   //create a grid,
   //fetch table data
    app.xhr({
        load: true,
        svc: "open_data_2",
        msg: "get",
        data: {
            kind : kind
        },
        success: function (data) {
            var r = data.response.data;
            var data = app.initLoadGrid(r,kind,fakeName);
            var headers = data[0];
            var values = data[1];
            app.gridEdit(r.ID___,headers,headers,values,fakeName,kind);
        }
    });
};

App.prototype.initLoadGrid = function(r,kind,fakeName,joined){
    var headers = [];
    var values = [];
    $.each(r, function (col) {
        if (app.reserved.indexOf(col.toLowerCase()) > -1)
            return;
        headers.push(col);
        values.push(r[col]);
    });
    if(!joined){
        headers.push("Delete Row");
        values.push([]);
        $.each(r.ID___, function (index) {
            var id = r.ID___[index];
            values[values.length - 1][index] = "<a href='#' onclick='app.deleteRow(\"" + id + "\",\"" + kind + "\",\"" + fakeName + "\")'>Delete</a>";
        }); 
    }   
    return [headers,values];
};

App.prototype.newGrid = function (options) {
    //data is loaded row by row
    //however we can convert to column by column
    //e.g. [[0,1,2,3],[0,3,4,5]] is treated as row one then row two
    var rows;
    if (options.load_column_by_column) {
        //transform col data to row data here
        rows = [];
        for (var x = 0; x < options.init_data[0].length; x++) {
            rows.push([]);
            for (var y = 0; y < options.col_names.length; y++) {
                rows[x].push(options.init_data[y][x]);
            }
        }
    }
    //if rows is undefined use init_data
    var initData = !rows ? options.init_data : rows;
    var container = $("#" + options.id);
    container.handsontable({
        data: initData,
        rowHeaders: true,
        colHeaders: options.col_names,
        contextMenu: true,
        columns: options.col_types(),
        width: app.getDim()[0] + "px",
        manualColumnResize: true,
        allowInvalid: false,
        afterChange: function (changes, source) {
            if (!changes)
                return;
            if (source === "edit" || source === "autofill") {
                //track edits only
                $.each(changes, function (x) {
                    var row = changes[x][0];
                    var col = changes[x][1];
                    var oldValue = changes[x][2];
                    var newValue = changes[x][3];
                    options.onEdit(row, col, oldValue, newValue);
                });
            }

        },
        cells: function (row, col, prop) {
            var cellProperties = {};
            if (options.disabled && options.disabled.indexOf(col) > -1) {
                cellProperties.readOnly = true;
                cellProperties.renderer = function (instance, td, row, col, prop, value, cellProperties) {
                    Handsontable.TextCell.renderer.apply(this, arguments);
                    td.style.fontWeight = 'bold';
                    td.style.color = 'black';
                    td.style.fontStyle = 'normal';
                    td.innerHTML = value;
                    return cellProperties;
                };
            }
            else if(options.html){
                cellProperties.renderer = function (instance, td, row, col, prop, value, cellProperties) {
                    Handsontable.TextCell.renderer.apply(this, arguments);
                    td.style.fontWeight = 'bold';
                    td.style.color = 'black';
                    td.style.fontStyle = 'normal';
                    td.innerHTML = value;
                    return cellProperties;
                };
            }
            return cellProperties;
        }
    });

};

App.prototype.loadGrid = function(ids, columns, headers, values,fakeName,realName,joined){
    var id = "handson_" + Math.floor(Math.random() * 1000000);
    var div = $("<div id='" + id + "'></div>");
    $("#main_view").append(div);
    var lastCol = headers.length - 1;
    app.newGrid({
        id: id,
        col_names: headers,
        load_column_by_column: true,
        init_data: values,
        html: true,
        disabled: [lastCol],
        col_types: function () {
            var types = [];
            $.each(headers, function (index) {
                var width = 120;
                types.push({
                    type: 'text',
                    width: width
                });
            });
            return types;
        },
        onEdit: function (row, col, oldValue, newValue) {
            //do a delayed save
            if(joined) return;
            app.runLater(1000, function () {
                var request = {
                    id: ids[row],
                    old_value: oldValue,
                    new_value: newValue,
                    column: columns[col],
                    fake_name: fakeName,
                    real_name: realName
                };
                app.xhr({
                    data: request,
                    svc: "open_data_2",
                    msg: "save_grid_edit",
                    load: false,
                    success: function (resp) {
                        var r = resp.response.data;
                        if (r === "success" || r.resp === "success") {
                            $("#state_icon").css("background", "lightgreen");
                            app.runLater(2000, function () {
                                $("#state_icon").css("background", "lightblue");
                            });
                            //if it was an insert add the new id to the ids
                            var rowCount = $("#"+id).handsontable('countRows');
                            if (resp.response.data.id && ids.length < rowCount) {//advance only when its new
                                ids.push(resp.response.data.id); //now we have the new id
                            }
                        }
                    }
                });
            });
        }
    });
};

App.prototype.gridEdit = function (ids, columns, headers, values,fakeName,realName) {
    $("#main_view").html("<div id='state_icon'>"+realName+"</div>\n\
        <textarea cols=1 rows=2 class='form-control' id='search_query' style='margin-bottom:5px' placeholder='e.g name = sam and age = 20'></textarea>\n\
        <input type='button' class='btn btn-info' value='Run Query' id='search_button' onclick='app.search(\""+realName+"\",\""+fakeName+"\")' style='margin-bottom:5px;'>\n\
        <input type='button' class='btn btn-info' value='Save Query' onclick='app.saveQuery()' style='margin-bottom:5px;'>\n\
        <input type='button' class='btn btn-info' value='Retrieve Query' onclick='app.retrieveQuery()' style='margin-bottom:5px;'>\n\
        <input type='button' class='btn btn-info' value='Visual Query' onclick='app.visualQuery()' style='margin-bottom:5px;'>\n\
        <hr>");//empty the area
    app.loadGrid(ids, columns, headers, values,fakeName,realName);
};

App.prototype.visualQuery = function(){
    var m = app.ui.modal("<div id='visual_area' style='overflow:auto'></div>", "Visual Query", {
        okText : "Run Query",
        cancelText : "Cancel",
        ok : function(){
            app.buildVisualQuery(m);
        }
    });
    var html = "<input type = 'button' class='btn' value='Add Property' id='add_prop' style='margin-right:5px'>\n\
                <input type = 'button' class='btn' value='Add Kind' id='add_kind'>\n\
                <input type = 'button' class='btn' value='Add Join Property' id='add_j_prop'>\n\
                <div id='property_builder' style='padding:5px'></div>";
    $("#visual_area").html(html);
    $("#add_prop").click(function(){
        var input = "<div style='display:flex'>\n\
                    <input type='text' class='form-control prop_name' style ='width:45%;margin:5px' placeholder='Property name'>\n\
                    <input type='text' class='form-control prop_value' style='width:45%;margin:5px' placeholder='Property value'><div>";
        $("#property_builder").append(input);
    });
    $("#add_kind").click(function () {
        var input = "<div style='display:flex;'> <input type='text' class='form-control kind_name' style ='width:45%;margin:5px' placeholder='e.g kind1'>\n\
                    <input type='text' class='form-control kind_value' style='width:45%;margin:5px' placeholder='e.g Person'><div>";
        $("#property_builder").append(input);
    });
    $("#add_j_prop").click(function () {
        var input = "<div style='display:flex;'> <input type='text' class='form-control j_prop_name' style ='width:45%;margin:5px' placeholder='e.g join_prop1'>\n\
                    <input type='text' class='form-control j_prop_value' style='width:45%;margin:5px' placeholder='e.g ID_NUMBER'><div>";
        $("#property_builder").append(input);
    });
    var height = app.getDim()[1] -220;
    $("#visual_area").css("height",height+"px");
    app.buildStringQuery();
};

App.prototype.buildStringQuery = function(){
    var query = $("#search_query").val();
    if(query.length === 0) return;
    if(query.startsWith("join:")){
        //select the appropriate option
        var index = query.indexOf(":") + 1;
        query = query.substring(index, query.length);
        var splitQuery = query.split("and");
        for (var x = 0; x < splitQuery.length; x++) {
            var subQuery = splitQuery[x].split("=");
            var propName = subQuery[0].trim();
            var propValue = subQuery[1].trim();;
            if(propName.indexOf("kind") > -1){
                //this is a kind
                $("#add_kind").click();
                var kn = $(".kind_name");
                var kv = $(".kind_value");
                kn[kn.length - 1].value = propName;
                kv[kv.length - 1].value = propValue;
            }
            else if(propName.indexOf("join_prop") > -1){
                //this is a join property
                $("#add_j_prop").click();
                var jpn = $(".j_prop_name");
                var jpv = $(".j_prop_value");
                jpn[jpn.length - 1].value = propName;
                jpv[jpv.length - 1].value = propValue;
            }
            else if(propName.indexOf("where") > -1){
                //this is a where property
                $("#add_prop").click();
                var pn = $(".prop_name");
                var pv = $(".prop_value");
                pn[pn.length - 1].value = propName;
                pv[pv.length - 1].value = propValue;
            }
        }
    }
    else {
        var splitQuery = query.split("and");
        for (var x = 0; x < splitQuery.length; x++) {
            var subQuery = splitQuery[x].split("=");
            var propName = subQuery[0].trim();
            var propValue = subQuery[1].trim();
            //this is a where property
            $("#add_prop").click();
            var pn = $(".prop_name");
            var pv = $(".prop_value");
            pn[pn.length - 1].value = propName;
            pv[pv.length - 1].value = propValue;
        }
    }
};

App.prototype.buildVisualQuery = function(m){
    //we build the query depending on the type
    //get all kinds first, if its a join
    var propNames = $(".prop_name");
    var propValues = $(".prop_value");
    var jPropNames = $(".j_prop_name");
    var jPropValues = $(".j_prop_value");
    var kindNames = $(".kind_name");
    var kindValues = $(".kind_value");
    var qString = "";
    var type = jPropNames.length > 0 ? "join" : "normal";
    if(type === "join"){
        qString += "join:";
        for(var y = 0; y < kindNames.length; y++){
            var kindN = kindNames[y].value;
            var kindV = kindValues[y].value;
            if (!kindN) {
                $(kindNames[y]).focus();
                return;
            }
            if (!kindV) {
                $(kindValues[y]).focus();
                return;
            }
            qString = qString + kindN + " = " + kindV + " and ";
        }
        
        for (var y = 0; y < jPropNames.length; y++) {
            var jPropName = jPropNames[y].value;
            var jPropValue = jPropValues[y].value;
            if (!jPropName) {
                $(jPropNames[y]).focus();
                return;
            }
            if (!jPropValue) {
                $(jPropValues[y]).focus();
                return;
            }
            qString = y < jPropNames.length || propNames.length > 0
                ? qString + jPropName + " = " + jPropValue + " and "
                : qString + jPropName + " = " + jPropValue + "" ;
                
        }
        for (var x = 0; x < propNames.length; x++) {
            var name = propNames[x].value;
            var value = propValues[x].value;
            if (!name) {
                $(propNames[x]).focus();
                return;
            }
            if (!value) {
                $(propValues[x]).focus();
                return;
            }
            qString = x === propNames.length - 1 ? qString + name + " = " + value + "" : qString + name + " = " + value + " and ";
        }
    }
    else if(type === "normal"){
        for (var x = 0; x < propNames.length; x++) {
            var name = propNames[x].value;
            var value = propValues[x].value;
            if (!name) {
                $(propNames[x]).focus();
                return;
            }
            if (!value) {
                $(propValues[x]).focus();
                return;
            }
            qString = x === propNames.length - 1 ? qString + name + " = " + value + "" : qString + name + " = " + value + " and ";
        }
    }
    
    m.modal('hide');
    $("#search_query").val(qString);
    $("#search_button").click();
    
};


App.prototype.retrieveQuery = function(){
    app.xhr({
        data: {},
        svc: "open_data_2",
        msg: "retrieve_query",
        load: true,
        success: function (resp) {
            var r = resp.response.data;
            var m = app.ui.modal("<div id='query_area'></div>","User Queries",{
                cancelText : "Cancel"
            });
            var q_name = $.extend(true, [], r.QUERY_NAME);
            var q = $.extend(true, [], r.QUERY);
            app.ui.table({
                id_to_append: "query_area",
                headers: ["Query Name" , "Delete"],
                values: [r.QUERY_NAME,r.QUERY],
                include_nums: true,
                style: "",
                mobile_collapse: true,
                transform: {
                    0: function (value,index) {
                        var href = $("<a href='#'>"+value+"</a>");
                        href.click(function(){
                            var query = q[index];
                            $("#search_query").val(query);
                            m.modal('hide'); 
                        });
                        return href;
                    },
                    1: function (value,index) {
                        var href = $("<a href='#'>Delete</a>");
                        href.click(function(){
                            var qName = q_name[index];
                            app.deleteQuery(qName);
                            m.modal('hide'); 
                        });
                        return href;
                    }
                }
            });
        }
    });
};

App.prototype.deleteQuery = function(qName){
    app.xhr({
        data: {
            query_name: qName
        },
        svc: "open_data_2",
        msg: "delete_query",
        load: true,
        load_area: "q_load_area",
        success: function (resp) {
            var r = resp.response.data;
            if (r === "success") {
                app.msg("Search query deleted successfully");
            }
            else if (r === "fail") {
                app.msg(resp.response.reason);
            }
        }
    });
};

App.prototype.saveQuery = function(){
    var query = $("#search_query").val();
    if(!query){
        app.msg("Nothing to save!");
        $("#search_query").focus();
        return;
    }
    var html = "<div id='q_load_area'></div><input type='text' class='form-control' id='query_name' placeholder='Query Name'>";
    var m = app.ui.modal(html,"Save Query",{
        okText : "Save",
        cancelText : "Cancel",
        ok : function(){
            var name = $("#query_name").val();
            if (!name) {
                app.msg("Please enter a name for the query you want to save");
                $("#query_name").focus();
                return;
            }
            app.xhr({
                data: {
                    query: query,
                    query_name : name
                },
                svc: "open_data_2",
                msg: "save_query",
                load: true,
                load_area : "q_load_area",
                success: function (resp) {
                    var r = resp.response.data;
                    if (r === "success") {
                        app.msg("Search query saved successfully");
                    }
                    else if(r === "fail"){
                        app.msg(resp.response.reason);
                    }
                }
            });
           m.modal('hide');
        }
    });
};

App.prototype.deleteRow = function(id,realName,fakeName){
    var conf = confirm("Delete row?");
    if(!conf) return;
    app.xhr({
        data: {
            id : id,
            real_name : realName
        },
        svc: "open_data_2",
        msg: "delete_row",
        load: false,
        success: function (resp) {
            var r = resp.response.data;
            if (r === "success") {
                app.explodeTable(realName,fakeName);
                $("#state_icon").css("background", "lightgreen");
                app.runLater(2000, function () {
                    $("#state_icon").css("background", "lightblue");
                });
            }
        }
    });   
};

App.prototype.joinQuery = function(query){
    var index = query.indexOf(":") + 1;
    query = query.substring(index,query.length);
    var splitQuery = query.split("and");
    var request = {};
    for(var x = 0; x < splitQuery.length; x++){
        var subQuery = splitQuery[x].split("=");
        var propName = subQuery[0].trim();
        var propValue = subQuery[1].trim();
        request[propName] = propValue;
    }
    app.xhr({
        data: request,
        svc: "open_data_2",
        msg: "multi_join",
        load: true,
        success: function (resp) {
            var r = resp.response.data;
            if(r === "fail"){
                app.msg(resp.response.reason);
                return;
            }
            var data = app.initLoadGrid(r,"","",true);
            var headers = data[0];
            var values = data[1];
            $(".handsontable").remove();
            app.loadGrid(r.ID___, headers, headers, values, "", "Joined Data",true);
        }
    });
};

App.prototype.search = function(kind,fakeName){
    var query = $("#search_query").val();
    if(!query){
        app.msg("No query specified");
        $("search_query").focus();
        return;
    }
    if(query.startsWith("join:")){
        app.joinQuery(query);
        return;
    }
    var splitQuery = query.split("and");
    var request = {kind : kind};
    for(var x = 0; x < splitQuery.length; x++){
        var subQuery = splitQuery[x].split("=");
        var propName = subQuery[0].trim();
        var propValue = subQuery[1].trim();
        request["where_"+propName] = propValue;
    }
    app.xhr({
        data: request,
        svc: "open_data_2",
        msg: "get",
        load: true,
        success: function (resp) {
            var r = resp.response.data;
            var data = app.initLoadGrid(r,kind,fakeName);
            var headers = data[0];
            var values = data[1];
            $(".handsontable").remove();
            app.loadGrid(r.ID___, headers, headers, values,fakeName,kind);
        }
    });
    
};

App.prototype.changePassword = function () {
    var username = $("#user_name").val();
    var oldPass = $("#old_password").val();
    var newPass = $("#new_password").val();
    var confPass = $("#confirm_password").val();
    if(!username){
        app.msg("Username is required");
        return;
    }
    else if(!oldPass){
        app.msg("Old password is required");
        return;
    }
    else if(!newPass){
        app.msg("New password is required");
        return;
    }
    else if(!confPass){
       app.msg("Confirm password is required");
       return; 
    }
    else if(confPass !== newPass){
        app.msg("Confirm password and new password do not match");
        return;  
    }
    var requestData = {
        user_name: username,
        old_password: oldPass,
        new_password: newPass,
        confirm_password: confPass
    };
   
    app.xhr({
        data: requestData,
        svc: "open_data_service",
        msg: "changepass",
        load: true,
        success: function (data) {
            if (data.response.data === true) {
                //login again
                window.location = "index.html";
            }
            else {
                app.msg("The old password specified is invalid");
            }
        }
    });
};

App.prototype.graphInterface = function(){
    //get all table names and column names
    app.xhr({
        data: {},
        svc: "open_data_2",
        msg: "tables_and_columns",
        load: true,
        success: function (data) {
            var r = data.response.data;
            var html = "<select id='table_name_1' class='form-control' style='width: 12%;margin-right:5px'>\n\
                            <option value=''>Table x</option>\n\
                        </select>\n\
                        <select id='col_1' class='form-control' style='width: 12%;margin-right:5px'>\n\
                            <option value=''>Column x</option>\n\
                        </select>\n\
                        <select id='table_name_2' class='form-control' style='width: 12%;margin-right:5px'>\n\
                            <option value=''>Table y</option>\n\
                        </select>\n\
                        <select id='col_2' class='form-control'  style='width: 12%;margin-right:5px'>\n\
                            <option value=''>Column y</option>\n\
                        </select>\n\
                        <input type='text' class='form-control' style='width:10%;height:35px;margin-right: 5px;' id='limit' placeholder='limit e.g 10'>\n\
                        <input type='button' onclick='app.plotGraph()' value='Render Graph' class='btn btn-info' style='height:35px'>";
            $("#visual_div").append(html);
            $("#main_view").append("<hr><div id='graph_area'></div>");
            $.each(r,function(x){
                var fakeName = r[x].fake_name;
                var realName = r[x].real_name;
                $("#table_name_1").append($("<option value='"+fakeName+"'>"+realName+"</option>"));
                $("#table_name_2").append($("<option value='"+fakeName+"'>"+realName+"</option>"));
                function onchange(table,col,colName){
                    var fake = $("#"+table).val();
                    for (var z = 0; z < r.length; z++) {
                        if (r[z].fake_name === fake) {
                            var props = r[z].prop_names;
                            $("#"+col).html("<option value=''>"+colName+"</option>");
                            $.each(props, function (y) {
                                $("#"+col).append($("<option value='" + props[y] + "'>" + props[y] + "</option>"));
                            });
                        }
                    } 
                }
                $("#table_name_2").change(function(){
                    onchange("table_name_2","col_2","Column y");
                });
                 $("#table_name_1").change(function(){
                    onchange("table_name_1","col_1","Column x");
                });
            });
        }
    });
    
};


App.prototype.plotGraph = function(){
    //get the data
    var fake1 = $("#table_name_1").val();
    var fake2 = $("#table_name_2").val();
    var col1 = $("#col_1").val();
    var col2 = $("#col_2").val();
    var limit = $("#limit").val();
    if(!fake1){
        app.msg("select table x");
        return;
    }
    if (!fake2) {
        app.msg("select table y");
        return;
    }
    if (!col1) {
        app.msg("select column x");
        return;
    }
    if (!col2) {
        app.msg("select column y");
        return;
    }
    if(!limit){
        limit = "-1";
    }
    var request = {
        fake_name_1 : fake1,
        fake_name_2 : fake2,
        col_1 : col1,
        col_2 : col2,
        limit : limit
    };
    app.xhr({
        data: request,
        svc: "open_data_2",
        msg: "graph_data",
        load: true,
        success: function (data) {
            var r = data.response.data;
            $("#graph_area").html("");
            Morris.Line({
                element: 'graph_area',
                parseTime: false,
                data: r , xkey: col1, ykeys: [col2], labels: ['']
            });  
        }
    });
};

window.app = new App();
