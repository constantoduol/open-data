
function UI() {

}

UI.prototype.modal = function (html, title, func) {
    var cancelBtn = "";
    var okBtn = "";
    if(func.cancelText){
        cancelBtn = "<button type='button' class='btn btn-info' data-dismiss='modal' id='modal_area_button_cancel' style='background-color:rgb(169, 169, 169)'>" + func.cancelText + "</button>";
    }
    if(func.okText){
        okBtn = "<button type='button' class='btn btn-info' id='modal_area_button_ok'>" + func.okText + "</button>";
    }
    var modalArea = $('#modal_area');
    var html = "<div class='modal fade' id='modal_area_window'>" +
            "<div class='modal-dialog'>" +
            "<div class='modal-content'>" +
            "<div class='modal-header'>" +
            "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
            "<h4 class='modal-title'>" + title + "</h4>" +
            "</div>" +
            "<div class='modal-body'>" +
            "<p id='modal_content_area'>" + html + "</p>" +
            "</div>" +
            "<div class='modal-footer'>" +
            cancelBtn +
            okBtn+
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>";
    modalArea.html(html);

    if(func.cancel) $("#modal_area_button_cancel").click(func.cancel);
    if(func.ok) $("#modal_area_button_ok").click(func.ok);

    var modal = $('#modal_area_window').modal();
    return modal;
};

UI.prototype.collapsible = function (idToAppend, title, content) {
    var id = "collapsible_" + Math.floor(Math.random() * 10000000);
    var html = "<div class = 'panel-group' id = "+id+" >" +
            "<div class = 'panel panel-default' >" +
            "<div class = 'panel-heading' >" +
            "<h4 class = 'panel-title' >" +
            "<a class = 'accordion-toggle' data-toggle='collapse' data-parent=#" + id + " href= '#collapseOne_" + id + "' >" +
            title +
            "</a>" +
            "</h4>" +
            "</div>" +
            "<div id='collapseOne_" + id + "' class = 'panel-collapse collapse in' >" +
            "<div class = 'panel-body' >" +
            content +
            "</div>" +
            "</div>" +
            "</div>";
    $("#" + idToAppend).append(html);
    return id;
};

//summarize this text, if it is beyond a
//specific length ellipsize the text and add
//an option of viewing the full text 
UI.prototype.summarize = function(text,length){
    if(text.length > length){
        var summary = text.substring(0, length)+"...";
        var html = "<a href='#' onclick='UI.prototype.showSummary(\""+text+"\")'>"+summary+"</a>";
        return html;
    }
    else {
        return text;
    }
};


UI.prototype.showSummary = function(text){
   UI.prototype.modal(text,'Extra Details',{
        cancelText : "Done"
   }); 
};

UI.prototype.table = function (options) {
    //options.id_to_append
    //options.headers
    //options.values
    //options.include_nums
    //options.style
    //options.mobile_collapse
    if (options.mobile_collapse && app.platform === "mobile") {
        //we want to collapse the table in case we are on a mobile device with limited space
        for (var x = 0; x < options.values[0].length; x++) {
            var html = "";
            for (var y = 0; y < options.headers.length; y++) {
                if (y === 0)
                    continue;
                if (options.values[y][x]) {
                    var div = "<div><span>" + options.headers[y] + "</span> : <span><b>" + options.values[y][x] + "</b></span></div>";
                    html += div;
                }
            }
            if(options.values[0][x]) {
                UI.prototype.collapsible(options.id_to_append, options.values[0][x], html);
            }
        }
        return;
    }


    var id = !options.id ? "table_" + Math.floor(Math.random() * 1000000) : options.id;
    var table = $("<table class='table table-condensed' id='" + id + "' style='" + options.style + "' >");
    var tr = $("<tr>");
    if (options.include_nums) {
        options.headers.unshift("No");
    }
    if(options.attributes){
        //bind attributes to the table
        $.each(options.attributes,function(attrName){
            var attrValue = options.attributes[attrName];
            table.attr(attrName,attrValue);
        });
    }
    
    for (var x = 0; x < options.headers.length; x++) {
        var th = $("<th>");
        th.html(options.headers[x]);
        tr.append(th);
    }
    table.append(tr);
    for (var x = 0; x < options.values[0].length; x++) {
        var tr = $("<tr>");
        var numTd = null;
        if (options.include_nums) {
            numTd = $("<td>");
            numTd.html((x + 1));
            tr.append(numTd);
        }
        
        //add the on row click event if present
        if(options.onRowClick){ 
            tr.click(function(event){
                options.onRowClick(options.values,event);
            });
        }
        
        for (var y = 0; y < options.values.length; y++) {
            var td = $("<td>");
                        
            //here we do transformations
            if(options.transform){
                if(options.transform[y]){
                    //we have a transform function here so deal with it
                    options.values[y][x] = options.transform[y](options.values[y][x],x);
                }
            }
            
            
            if (typeof options.values[y][x] === "string") {
                //do any summarizing here
                 if(options.summarize && options.summarize.cols.indexOf(y) > -1) {
                    var sIndex = options.summarize.cols.indexOf(y);
                    var summary = UI.prototype.summarize(options.values[y][x],options.summarize.lengths[sIndex]);
                    td.html(summary);
                }
                else {
                    td.html(options.values[y][x]);  
                }
            }
            else {
                td.append(options.values[y][x]);
            }
            tr.append(td);
        }
        table.append(tr);
    }
    $("#" + options.id_to_append).append(table);
    table.addClass(options.class);
    if(options.onRender) options.onRender(id); //say that the table has finished rendering
    if(options.show_prev_next){
        //incase we need to show a prev and next button
        $("#" + options.id_to_append).append("<div class='paginate_navigate'>\n\
                <img src='img/back.png' alt='Previou' id='paginate_back' title='Previous' class='paginate_round_icon'>\n\
                <img src='img/forward.png' alt='Next' id='paginate_back' title='Next' class='paginate_round_icon'>\n\
         </div>");
    }
    return id;
};