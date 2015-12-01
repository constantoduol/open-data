App.prototype.interface = {
    users : {
        username : {
            type: "text",
            id: "username",
            required: true,
            label: "Username",
            "class" : "form-control"
        },
        password : {
            type: "text",
            id: "password",
            required: true,
            label: "Confirm Password",
            "class" : "form-control"
        },
        api_span : {
            type: "<div>",
            id: "api_span",
            style : "width:100%; margin-top:10px; height : 30px;font-size: 20px;"
        },
        create_btn : {
            type: "button",
            id: "create_btn",
            value: "Create User",
            "class" : "btn btn-info",
            style : "margin-top : 20px",
            events: {
                click: app.createUser
            }
        },
        delete_btn : {
            type: "button",
            id: "delete_btn",
            value: "Delete User",
            "class" : "btn btn-info",
            style : "margin-top : 20px;margin-left : 10px",
            events: {
                click: app.deleteUser
            }
        },
        get_api_key_btn : {
            type: "button",
            id: "get_api_key_btn",
            value: "Get API Key",
            "class": "btn btn-info",
            style: "margin-top : 20px;margin-left : 10px",
            events: {
                click: app.getAPIKey
            }
        }
    },
    data : {
        new_en_btn : {
            type: "button",
            id: "new_en_btn",
            value: "New Table",
            "class": "btn btn-info",
            style: "margin-top : 20px;margin-left : 10px",
            events: {
                click: app.newEntity
            }
        },
        api_span : {
           type : "<div>",
           id : "api_span",
           style : "  font-size: 20px;margin-left: 10px;margin-top: 5px;background-color: rgb(173, 216, 230);color: rgb(255, 255, 255);padding: 5px;"
        },
        data_span: {
            type: "<div>",
            id: "data_span",
            style: "width : 100%; margin-top:10px; height : 30px;font-size: 20px;"
        }
    },
    new_en : {
        table_name: {
            type: "text",
            id: "table_name",
            required: true,
            label: "Table Name",
            "class": "form-control"
        },
        hr : {
            type : "<hr>"
        },
        add_col_btn: {
            type: "button",
            id: "add_col_btn",
            value: "Add Column",
            "class": "btn btn-info",
            style: "margin-top : 20px",
            events: {
                click: app.addColumn
            }
        },
        create_table_btn: {
            type: "button",
            id: "create_table_btn",
            value: "Create Table",
            "class": "btn btn-info",
            style: "margin-top : 20px;margin-left:10px",
            events: {
                click: app.newTable
            }
        }
    },
    visual : {
        graph_btn: {
            type: "button",
            id: "graph_btn",
            value: "Graphs",
            "class": "btn btn-info",
            style: "margin-top : 20px;margin-left : 10px",
            events: {
                click: app.graphInterface
            }
        },
        custom_btn: {
            type: "<a href='custom.html'>",
            id: "custom_btn",
            html: "Custom",
            "class": "btn btn-info",
            style: "margin-top : 20px;margin-left : 10px"
        },
        hr : {type : "<hr>"},
        visual_div: {
            type: "<div>",
            id: "visual_div",
            style: "width : 100%; margin-top:10px;font-size: 20px;display:flex"
        }
    }
};