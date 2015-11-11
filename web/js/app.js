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
        app.fetchUserData();
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
        $("#load_area").html("<img src='img/loader.gif'>");
    }
    var defaultOptions = {
        method : "post",
        url : "/server",
        data: "json=" + encodeURIComponent(JSON.stringify(request)),
        dataFilter : function(data){
            if (options.load) {
                $("#load_area").html("");
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

App.prototype.initLoadGrid = function(r,kind,fakeName){
    var headers = [];
    var values = [];
    $.each(r, function (col) {
        if (app.reserved.indexOf(col.toLowerCase()) > -1)
            return;
        headers.push(col);
        values.push(r[col]);
    });
    headers.push("Delete Row");
    values.push([]);
    $.each(r.ID___, function (index) {
        var id = r.ID___[index];
        values[values.length - 1][index] = "<a href='#' onclick='app.deleteRow(\"" + id + "\",\"" + kind + "\",\"" + fakeName + "\")'>Delete</a>";
    }); 
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

App.prototype.loadGrid = function(ids, columns, headers, values,fakeName,realName){
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
        <input type='text' class='form-control' id='search_query' style='margin-bottom:5px' placeholder='e.g name = sam and age = 20'>\n\
        <input type='button' class='btn btn-info' value='Search' onclick='app.search(\""+realName+"\",\""+fakeName+"\")' style='margin-bottom:5px;'><hr>");//empty the area
    app.loadGrid(ids, columns, headers, values,fakeName,realName);
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

App.prototype.search = function(kind,fakeName){
    var query = $("#search_query").val();
    if(!query){
        app.msg("No query specified");
        $("search_query").focus();
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

window.app = new App();
