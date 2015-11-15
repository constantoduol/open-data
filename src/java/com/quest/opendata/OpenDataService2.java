
package com.quest.opendata;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.quest.access.common.UniqueRandom;
import com.quest.access.common.datastore.Datastore;
import com.quest.access.common.io;
import com.quest.access.control.Server;
import com.quest.access.useraccess.Serviceable;
import com.quest.access.useraccess.User;
import com.quest.access.useraccess.services.Message;
import com.quest.access.useraccess.services.UserService;
import com.quest.access.useraccess.services.annotations.Endpoint;
import com.quest.access.useraccess.services.annotations.WebService;
import com.quest.servlets.ClientWorker;
import java.io.IOException;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author conny
 */
@WebService(name = "open_data_2", privileged = "yes")
public class OpenDataService2 implements Serviceable {

    @Override
    public void service() {
       
    }

    @Override
    public void onStart(Server serv) {
        
    }

    @Override
    public void onPreExecute(Server serv, ClientWorker worker) {
       
    }
    
    @Endpoint(name="all_entities")
    public void allEntities(Server serv, ClientWorker worker){
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        Filter filter = new FilterPredicate("API_KEY",FilterOperator.EQUAL,apiKey);
        JSONObject json = Datastore.entityToJSON(Datastore.getMultipleEntities("ENTITY_STATS", filter));
        worker.setResponseData(json);
        serv.messageToClient(worker);
    }
    
    private String userNameToApiKey(String username){
        Filter filter1 = new Query.FilterPredicate("NAME",FilterOperator.EQUAL,username);
        Entity en = Datastore.getSingleEntity("API_ACCESS", filter1);
        if(en != null){
           return en.getProperty("API_KEY").toString();
        }
        return "";
    }
    
    @Endpoint(name="create_user")
    public void createUser(Server serv, ClientWorker worker) throws JSONException{
        UserService us = new UserService();
        worker.setPropagateResponse(false);
        User user = us.createUser(serv, worker);
        worker.setPropagateResponse(true);
        if(user != null){
            //create the api key
            JSONObject resp = new JSONObject();
            String apiKey = generateAPIKey(worker);
            resp.put("user_resp",worker.getResponseData());
            resp.put("api_key",apiKey);
            worker.setResponseData(resp);
            serv.messageToClient(worker);
        }
        else {
            worker.setResponseData(Message.FAIL);
            serv.messageToClient(worker);
        }
    }
    
    @Endpoint(name = "delete_user")
    public void deleteUser(Server serv, ClientWorker worker) {
        UserService us = new UserService();
        worker.setPropagateResponse(false);
        us.deleteUser(serv, worker);
        worker.setPropagateResponse(true);
        JSONObject requestData = worker.getRequestData();
        String name = requestData.optString("name");
        String apiKey = userNameToApiKey(name);
        Filter filter = new FilterPredicate("NAME", FilterOperator.EQUAL, name);
        Datastore.deleteSingleEntity("API_ACCESS", filter);
        //delete all entities associated with user
        Filter filter1 = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Iterable<Entity> multipleEntities = Datastore.getMultipleEntities("ENTITY_STATS", filter1);
        for(Entity en : multipleEntities){
            String fakeName = en.getProperty("ENTITY_NAME_FAKE").toString();
            Datastore.deleteAllEntities(fakeName);
        }
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }
    
    
    
    @Endpoint(name = "get_api_key")
    public void getAPIKey(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String name = requestData.optString("name");
        Filter filter = new Query.FilterPredicate("NAME", FilterOperator.EQUAL, name);
        Entity en = Datastore.getSingleEntity("API_ACCESS", filter);
        if (en != null) {
            worker.setResponseData(en.getProperty("API_KEY"));
        } else {
            worker.setResponseData("Non existent username : " + name);
        }
        serv.messageToClient(worker);
    }
    
    
    private String generateAPIKey(ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String name = requestData.optString("name");
        Filter filter = new Query.FilterPredicate("NAME", FilterOperator.EQUAL, name);
        Entity en = Datastore.getSingleEntity("API_ACCESS", filter);
        if (en == null) {
            String apiKey = new UniqueRandom(20).nextMixedRandom();
            en = new Entity("API_ACCESS");
            en.setProperty("NAME", name);
            en.setProperty("API_KEY", apiKey);
            Datastore.insert(en);
            return apiKey;
        } else {
           return "";
        }
    }
    
    @Endpoint(name="save")
    public void save(Server serv, ClientWorker worker) throws JSONException{
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        JSONObject requestData = worker.getRequestData();
        String kind = requestData.optString("kind");
        Filter filter1 = new FilterPredicate("ENTITY_NAME", FilterOperator.EQUAL, kind);
        Filter filter2 = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Entity en = Datastore.getSingleEntity("ENTITY_STATS", filter1,filter2);
        if(en != null){
            worker.setResponseData(Message.FAIL);
            worker.setReason("Table already exists");
            serv.messageToClient(worker);
            return;//the table already exists
        }
        requestData.put("api_key", apiKey);
        worker.setRequestData(requestData);
        OpenDataService os = new OpenDataService();
        os.save(serv, worker);
    }
    
    @Endpoint(name="get")
    public void get(Server serv, ClientWorker worker) throws IOException, JSONException{
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        JSONObject requestData = worker.getRequestData();
        requestData.put("api_key", apiKey);
        requestData.put("filter_meta", false);
        worker.setRequestData(requestData);
        OpenDataService os = new OpenDataService();
        os.get(serv, worker);
    }
    
    @Endpoint(name="delete_table")
    public void deleteTable(Server serv, ClientWorker worker){
        JSONObject requestData = worker.getRequestData();
        String fakeName = requestData.optString("fake_name");
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        Filter filter1 = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Filter filter2 = new FilterPredicate("ENTITY_NAME_FAKE", FilterOperator.EQUAL, fakeName);
        Datastore.deleteSingleEntity("ENTITY_STATS", filter1,filter2);
        Datastore.deleteAllEntities(fakeName);
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
    }
    
    @Endpoint(name = "save_grid_edit")
    public void saveGridEdit(Server serv, ClientWorker worker) throws JSONException {
        JSONObject requestData = worker.getRequestData();
        String column = requestData.optString("column").trim();
        String id = requestData.optString("id");
        String fakeName = requestData.optString("fake_name");
        String newValue = requestData.optString("new_value");
        if(id == null || id.isEmpty()){
            //this is an insert
            gridEditInsert(serv, worker);
            return;
        }
        Filter filter = new FilterPredicate("ID___", FilterOperator.EQUAL, id);
        Datastore.updateSingleEntity(fakeName, new String[]{column}, new String[]{newValue}, filter);
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }
    
    private void gridEditInsert(Server serv, ClientWorker worker) throws JSONException{
        JSONObject requestData = worker.getRequestData();
        String colName = requestData.optString("column");
        String colValue = requestData.optString("new_value");
        String kind = requestData.optString("real_name");
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        requestData.put(colName, colValue);
        requestData.put("kind", kind);
        requestData.put("api_key", apiKey);
        requestData.remove("column");
        requestData.remove("id");
        requestData.remove("fake_name");
        requestData.remove("real_name");
        requestData.remove("new_value");
        requestData.remove("old_value");
        worker.setPropagateResponse(false);
        OpenDataService os = new OpenDataService();
        String id = os.save(serv, worker); 
        JSONObject resp = new JSONObject();
        resp.put("resp", worker.getResponseData());
        resp.put("id", id);
        worker.setPropagateResponse(true);
        worker.setResponseData(resp);
        serv.messageToClient(worker);
    }
    
    @Endpoint(name="delete_row")
    public void deleteRow(Server serv, ClientWorker worker) throws JSONException{
        JSONObject requestData = worker.getRequestData();
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        String id = requestData.optString("id");
        String realName = requestData.optString("real_name");
        requestData.put("where_ID___", id);
        requestData.put("api_key", apiKey);
        requestData.put("kind", realName);
        OpenDataService os = new OpenDataService();
        os.delete(serv, worker);
    }
    
    @Endpoint(name="save_query")
    public void saveQuery(Server serv, ClientWorker worker){
        JSONObject requestData = worker.getRequestData();
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        String query = requestData.optString("query");
        String qName = requestData.optString("query_name");
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Entity exists = Datastore.getSingleEntity(qName, filter);
        if(exists != null){
            worker.setReason("Specified Query name already exists");
            serv.messageToClient(worker.setResponseData(Message.FAIL)); 
            return;
        }
        Entity en = new Entity("USER_QUERY");
        en.setProperty("API_KEY", apiKey);
        en.setProperty("QUERY_NAME", qName);
        en.setProperty("QUERY", query);
        Datastore.insert(en);
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
    }
    
    
    @Endpoint(name="retrieve_query")
    public void retrieveQuery(Server serv, ClientWorker worker){
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        JSONObject json = Datastore.entityToJSON(Datastore.getMultipleEntities("USER_QUERY", filter));
        serv.messageToClient(worker.setResponseData(json));
    }
    
    @Endpoint(name = "delete_query")
    public void deleteQuery(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        String qName = requestData.optString("query_name");
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Filter filter1 = new FilterPredicate("QUERY_NAME", FilterOperator.EQUAL, qName);
        Datastore.deleteSingleEntity("USER_QUERY", filter,filter1);
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
    }
    
    @Endpoint(name = "multi_join")
    public void multiJoin(Server serv, ClientWorker worker) throws JSONException {
        try{
            JSONObject requestData = worker.getRequestData();
            String username = worker.getSession().getAttribute("username").toString();
            String apiKey = userNameToApiKey(username);
            requestData.put("api_key", apiKey);
            OpenDataService os = new OpenDataService();
            os.multiJoin(serv, worker);
        }
        catch(Exception e){
            worker.setResponseData(Message.FAIL);
            worker.setReason("Invalid join query specified");
            serv.messageToClient(worker);
        }
    }
    
}
