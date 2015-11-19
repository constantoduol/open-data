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
            load: true,
            svc: "open_data_2",
            msg: "multi_join",
            data: {
                kind1: "DRIVER_DETAILS",
                kind2 : "DRIVER_OFFENSES",
                kind3 : "DRIVER_OFFENSES",
                kind4 : "OFFENSES",
                join_prop1 : "ID_NUMBER",
                join_prop2 : "ID_NUMBER",
                join_prop3 : "OFFENSE_ID",
                join_prop4 : "OFFENSE_ID",
                where1_ID_NUMBER : id,
                where2_ID_NUMBER : id,
                where3_ID_NUMBER : id
            },
            success: function (data) {
                function count(arr,str){
                    var count = 0;
                    for(var y = 0; y < arr.length; y++ ){
                        if(arr[y].toLowerCase() === str.toLowerCase()){
                            count++;
                        }
                    }
                    return count;
                }
                var r = data.response.data;
                var blocked = count(r.CATEGORY,"major") > 0 || count(r.CATEGORY,"minor") > 1 ? "Blocked" : "";
                var blockStatus = "<div style='color:red'>"+blocked+"</div>";
                $("#name_area").html(r.FIRST_NAME[0] + " "+r.LAST_NAME[0] + " "+blockStatus);
                $("#offense_list").html("");
                app.ui.table({
                    id_to_append: "offense_list",
                    headers: ["Offense ID", "Offense Name", "Category","Jail Term"],
                    values: [r.OFFENSE_ID, r.OFFENSE_NAME, r.CATEGORY,r.JAIL_TERM],
                    include_nums: true,
                    style: "",
                    mobile_collapse: true
                });
            }
        }); 
    });
};

App.prototype.customInterface = function(){
    var user = localStorage.getItem("current_user");
    if(user === "ndehi"){
        app.driverSearch();
    }
};


