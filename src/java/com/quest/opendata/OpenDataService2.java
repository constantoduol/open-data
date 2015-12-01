
package com.quest.opendata;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.appengine.api.datastore.Query.SortDirection;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.JSONArray;
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
        //save the ordered column names, there values are blank strings
        //save the order of columns
        JSONArray cols = requestData.optJSONArray("col_names");
        List<String> columns = cols.toList();
        for(String col : columns){
            requestData.put(col, "");
        }
        requestData.remove("col_names");
        //create the entity's fake name here
        String fakeName = new UniqueRandom(20).nextMixedRandom();
        Entity stats = new Entity("ENTITY_STATS");
        stats.setProperty("ENTITY_NAME", kind);
        stats.setProperty("API_KEY", apiKey);
        stats.setProperty("ENTITY_NAME_FAKE", fakeName);
        stats.setProperty("COLUMN_ORDER",cols.toString());
        stats.setProperty("CREATED", System.currentTimeMillis());
        Datastore.insert(stats);
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
        OpenDataService os = new OpenDataService();
        requestData.put("api_key", apiKey);
        requestData.put("filter_meta", false);
        String kind = requestData.optString("kind");
        Filter filter1 = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Filter filter2 = new FilterPredicate("ENTITY_NAME_FAKE", FilterOperator.EQUAL, os.getEntityFakeName(kind, apiKey));
        Entity en = Datastore.getSingleEntity("ENTITY_STATS", filter1,filter2);
        worker.setPropagateResponse(false);
        worker.setRequestData(requestData);
        os.get(serv, worker);
        JSONObject resp = new JSONObject();
        resp.put("col_order", en.getProperty("COLUMN_ORDER"));
        resp.put("get_data", worker.getResponseData());
        worker.setPropagateResponse(true);
        serv.messageToClient(worker.setResponseData(resp));
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
    
    @Endpoint(name = "delete_column")
    public void deleteColumn(Server serv, ClientWorker worker) throws JSONException {
        JSONObject requestData = worker.getRequestData();
        String colName = requestData.optString("column_name");
        String fakeName = requestData.optString("fake_name");
        Iterable<Entity> all = Datastore.getAllEntities(fakeName);
        for(Entity en : all){
            en.removeProperty(colName);
            Datastore.insert(en);
        }
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
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
            e.printStackTrace();
            io.log(e, Level.SEVERE, this.getClass());
            worker.setResponseData(Message.FAIL);
            worker.setReason("Invalid join query specified");
            serv.messageToClient(worker);
        }
    }
    
    @Endpoint(name = "tables_and_columns")
    public void tablesAndColumns(Server serv, ClientWorker worker) throws JSONException {
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Iterable<Entity> all = Datastore.getMultipleEntities("ENTITY_STATS", filter);
        JSONArray allData = new JSONArray();
        for(Entity en : all){
            String fakeName = en.getProperty("ENTITY_NAME_FAKE").toString();
            String realName = en.getProperty("ENTITY_NAME").toString();
            JSONObject singleData = new JSONObject();
            singleData.put("real_name", realName);
            singleData.put("fake_name", fakeName);
            ArrayList<String> propNames = Datastore.getEntityPropNames(fakeName);
            propNames.remove("TIMESTAMP___");
            propNames.remove("ID___");
            singleData.put("prop_names", new JSONArray(propNames));
            allData.put(singleData);
        }
        serv.messageToClient(worker.setResponseData(allData));
    }
    
    @Endpoint(name="graph_data")
    public void graphData(Server serv, ClientWorker worker) throws JSONException {
        JSONObject requestData = worker.getRequestData();
        String fakeNamex = requestData.optString("fake_name_x");
        JSONArray fakeNamesY = requestData.optJSONArray("fake_names_y");
        String colx = requestData.optString("col_x");
        JSONArray colsY = requestData.optJSONArray("cols_y");
        int limit = requestData.optInt("limit");
        String order = requestData.optString("order","forwards");
        SortDirection dir = order.equals("forwards") ? SortDirection.ASCENDING : SortDirection.DESCENDING;
        FetchOptions options = limit == -1 ? FetchOptions.Builder.withDefaults() : FetchOptions.Builder.withLimit(limit);
        List<Entity> entitiesOne = Datastore.getAllEntitiesAsList(fakeNamex,options,"TIMESTAMP___",dir);
        ArrayList<List<Entity>> ydata = new ArrayList();
        for(int x = 0; x < fakeNamesY.length(); x++){
            String fakeName = fakeNamesY.optString(x);
            List<Entity> entitiesTwo = Datastore.getAllEntitiesAsList(fakeName, options, "TIMESTAMP___",dir);
            ydata.add(entitiesTwo);
        }
        
        JSONArray all = new JSONArray();
        for(int x = 0; x < entitiesOne.size(); x++){
            Entity en1 = entitiesOne.get(x);
            JSONObject obj = new JSONObject();
            Object valuex = en1.getProperty(colx);
            obj.put(colx, valuex);
            for(int y = 0; y < ydata.size(); y++){
                String colY = colsY.optString(y);
                Entity en = ydata.get(y).get(x);
                obj.put(colY, en.getProperty(colY));
            }
            all.put(obj);
        }
        serv.messageToClient(worker.setResponseData(all));
    }
    
    @Endpoint(name="save_graph_data")
    public void saveGraphData(Server serv, ClientWorker worker){
        JSONObject requestData = worker.getRequestData();
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        String fakeNameX = requestData.optString("fake_name_x");
        int limit = requestData.optInt("limit");
        String order = requestData.optString("order");
        String colX = requestData.optString("col_x");
        String name = requestData.optString("graph_name");
        JSONArray fakeNamesY = requestData.optJSONArray("fake_names_y");
        JSONArray colNamesY = requestData.optJSONArray("cols_y");
        boolean exists = Datastore.exists("GRAPH_DATA",new String[]{"graph_name"}, new String[]{name});
        if(exists){
            worker.setReason("Graph specified already exists");
            worker.setResponseData(Message.FAIL);
            serv.messageToClient(worker);
            return;
        }
        Entity en = new Entity("GRAPH_DATA");
        en.setProperty("limit", limit);
        en.setProperty("col_x", colX);
        en.setProperty("fake_name_x", fakeNameX);
        en.setProperty("fake_names_y", fakeNamesY.toString());
        en.setProperty("col_names_y", colNamesY.toString());
        en.setProperty("api_key", apiKey);
        en.setProperty("graph_name", name);
        en.setProperty("order", order);
        en.setProperty("timestamp", System.currentTimeMillis());
        Datastore.insert(en);
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
    }
    
    @Endpoint(name="retrieve_graph_data")
    public void retrieveGraphData(Server serv, ClientWorker worker){
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        Filter filter = new FilterPredicate("api_key", FilterOperator.EQUAL, apiKey);
        JSONObject json = Datastore.entityToJSON(
                Datastore.getMultipleEntities("GRAPH_DATA","timestamp", SortDirection.ASCENDING, filter));
        serv.messageToClient(worker.setResponseData(json));
    }
    
    @Endpoint(name="delete_graph_data")
    public void deleteGraphData(Server serv, ClientWorker worker){
        JSONObject requestData = worker.getRequestData();
        String username = worker.getSession().getAttribute("username").toString();
        String graphName = requestData.optString("graph_name");
        String apiKey = userNameToApiKey(username);
        Filter filter = new FilterPredicate("api_key", FilterOperator.EQUAL, apiKey);
        Filter filter1 = new FilterPredicate("graph_name", FilterOperator.EQUAL, graphName);
        Datastore.deleteSingleEntity("GRAPH_DATA", filter,filter1);
        serv.messageToClient(worker.setResponseData(Message.SUCCESS));
    }
    
    @Endpoint(name="entity_get")
    public void entityGet(Server serv, ClientWorker worker) throws JSONException{
        JSONObject requestData = worker.getRequestData();
        JSONArray entities = requestData.optJSONArray("entities");
        JSONArray limits = requestData.optJSONArray("limits");
        String username = worker.getSession().getAttribute("username").toString();
        String apiKey = userNameToApiKey(username);
        OpenDataService os = new OpenDataService();
        JSONObject data = new JSONObject();
        for(int x = 0; x < entities.length(); x++){
            String realName = entities.optString(x);
            int limit = limits.optInt(x);
            String fakeName = os.getEntityFakeName(realName, apiKey);
            FetchOptions options = limit == -1 ? FetchOptions.Builder.withDefaults() : FetchOptions.Builder.withLimit(limit); 
            JSONObject json = Datastore.entityToJSON(Datastore.getMultipleEntities(fakeName, options, new Filter[]{}));
            data.put(realName, json);
        }
        serv.messageToClient(worker.setResponseData(data));
    }
    
    
    public static void main(String [] args){
        String [] a = null;
        io.out(Arrays.toString(a));
    }
}
