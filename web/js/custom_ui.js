App.prototype.interface = {
    driver_search : {
        driver_id : {
            type: "text",
            id: "driver_id",
            label: "",
            "class" : "form-control",
            style : "width:30%"
        },
        driver_search_btn : {
            type: "button",
            id: "driver_search_btn",
            value: "Search",
            "class" : "btn btn-info",
            events : {
                click : app.driverSearch
            }
        },
        offenses_span : {
            type: "<div>",
            id: "offenses_span",
            style : "width : 100%; margin-top:10px; height : 30px;font-size: 20px;"
        }
    }
};

