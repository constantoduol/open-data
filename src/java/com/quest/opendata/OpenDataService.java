/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
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
import com.quest.access.useraccess.services.Message;
import com.quest.access.useraccess.services.annotations.Endpoint;
import com.quest.access.useraccess.services.annotations.WebService;
import com.quest.servlets.ClientWorker;
import java.io.IOException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

/**
 *
 * @author conny
 */
@WebService(name = "open_data", privileged = "no")
public class OpenDataService implements Serviceable {
    
    private static ArrayList reserved = new ArrayList();
   
    
    @Override
    public void service() {

    }

    @Override
    public void onStart(Server serv) {
        reserved.add("ID___");
        reserved.add("TIMESTAMP___");
    }

    @Override
    public void onPreExecute(Server serv, ClientWorker worker) {

    }
    
    public static void main(String [] args){
        DateFormat dateFormat = new SimpleDateFormat("HH:mm:ss");
        Date date = new Date();
        io.out(dateFormat.format(date));
    }

    private void trackEntityStats(String [] names,String apiKey,String updateType,List propNames){
        String entityFakeName = names[1];
        String realName = names[0];
        Filter filter1 = new FilterPredicate("ENTITY_NAME_FAKE", FilterOperator.EQUAL,entityFakeName);
        Filter filter2 = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        if(updateType.equals("save")){
            //check whether we have this entity 
            Entity en = Datastore.getSingleEntity("ENTITY_STATS", filter1,filter2);
            if(en == null){//if this entry exists dont add it
                en = new Entity("ENTITY_STATS");
                en.setProperty("ENTITY_NAME",realName);
                en.setProperty("API_KEY", apiKey);
                en.setProperty("ENTITY_NAME_FAKE",entityFakeName);
                en.setProperty("CREATED",System.currentTimeMillis());
                Datastore.insert(en);
            }
        }
        else if(updateType.equals("delete")){
            //check first whether the entity exists at all
            List<Entity> list = Datastore.getMultipleEntitiesAsList(entityFakeName);
            if(list != null && list.size() > 0){
                //we still have this entities
            }
            else {
                //no such entities exists so delete
                //Datastore.deleteSingleEntity("ENTITY_STATS", filter1,filter2);
                ArrayList blanks = new ArrayList();
                for (Object propName : propNames) {
                    if(propName.equals("ID___")){
                        blanks.add(new UniqueRandom(20).nextMixedRandom());
                    }
                    else if(propName.equals("TIMESTAMP___")){
                        blanks.add(System.currentTimeMillis());
                    }
                    else {
                        blanks.add(" ");
                    }
                }
               Datastore.insert(entityFakeName,propNames, blanks);
                //put empty strings
            }
        }
    }

    private boolean checkAPIKey(String apiKey, ClientWorker worker, Server serv) {
        if (apiKey != null && apiKey.length() > 0) {
            Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
            Entity en = Datastore.getSingleEntity("API_ACCESS", filter);
            if (en == null) {
                worker.setResponseData(Message.FAIL);
                worker.setReason("No valid API key specified");
                serv.messageToClient(worker);
                return false;
            }
            return true;
        } else {
            worker.setResponseData(Message.FAIL);
            worker.setReason("No valid API key specified");
            serv.messageToClient(worker);
            return false;
        }
    }

    @Endpoint(name = "save")
    public String save(Server serv, ClientWorker worker) {
        //params kind=Person
        JSONObject requestData = worker.getRequestData();
        String realEntityName = requestData.optString("kind");
        String apiKey = requestData.optString("api_key");
        String fakeEntityName = getEntityFakeName(realEntityName, apiKey);
        fakeEntityName = fakeEntityName.isEmpty() ? new UniqueRandom(20).nextMixedRandom() : fakeEntityName;
        if (!checkAPIKey(apiKey, worker, serv)) {
            return "";
        }
        String noDuplicateProp = requestData.optString("no_duplicates");
        if (noDuplicateProp.length() > 0) {
            Filter filter = new FilterPredicate(noDuplicateProp, FilterOperator.EQUAL, requestData.optString(noDuplicateProp));
            Entity en = Datastore.getSingleEntity(fakeEntityName, filter);
            if (en != null) {
                worker.setResponseData(Message.FAIL);
                worker.setReason("Duplicate value found for property " + noDuplicateProp + "");
                serv.messageToClient(worker);
                return "";
            }

        }
        
        requestData.remove("kind");
        requestData.remove("api_key");
        requestData.remove("no_duplicates");
        //check if this entity exists for data integrity
        ArrayList<String> entityPropNames = Datastore.getEntityPropNames(fakeEntityName);
        Iterator<String> colIter = requestData.keys();
        while(colIter.hasNext()){
            String col = colIter.next();
            if(!entityPropNames.contains(col)){
                //this is a completely new column
                entityPropNames.add(col);//add the column that is not part of the existing entities
                Datastore.updateAllEntities(fakeEntityName,col," ");
            }
        }
        Entity en = new Entity(fakeEntityName);
        for(String propName : entityPropNames){
            if(reserved.contains(propName.toUpperCase())) continue;//dont overwrite reserved properties
            String propValue = resolveMappings(requestData.optString(propName,""));
            en.setProperty(propName, propValue);
        }
        //these are reserved properties
        String id =  new UniqueRandom(20).nextMixedRandom();
        en.setProperty("ID___",id);
        en.setProperty("TIMESTAMP___", System.currentTimeMillis());
        Datastore.insert(en);
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
        trackEntityStats(new String[]{realEntityName,fakeEntityName}, apiKey, "save",null);
        return id;
    }
    
    /**
     * this method resolves mappings for times and dates
     * e.g timestamp___, date___, datetime___, time___
     * @param propValue a value to map
     * @return the mapped value
     */
    private String resolveMappings(String propValue){
        Date date = new Date();
        if(propValue.equals("timestamp___")){
            Long timestamp = System.currentTimeMillis();
            return timestamp.toString();
        }
        else if(propValue.equals("datetime___")){
            DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
            return dateFormat.format(date);
        }
        else if(propValue.equals("date___")){
            DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
            return dateFormat.format(date);
        }
        else if(propValue.equals("time___")){
            DateFormat dateFormat = new SimpleDateFormat("HH:mm:ss");
            return dateFormat.format(date);
        }
        return propValue;
    }
    

    @Endpoint(name = "update")
    public void update(Server serv, ClientWorker worker) {
        //kind=Person, update_Age=20, update_Name=20, where_Age = 30, where_Name = connie
        JSONObject requestData = worker.getRequestData();
        String realEntityName = requestData.optString("kind");
        String apiKey = requestData.optString("api_key");
        String fakeEntityName = getEntityFakeName(realEntityName, apiKey);
        if (!checkAPIKey(apiKey, worker, serv)) {
            return;
        }
        Iterator iter = requestData.keys();
        ArrayList<Filter> filters = new ArrayList();
        ArrayList<String> propNames = new ArrayList();
        ArrayList<String> propValues = new ArrayList();
        while (iter.hasNext()) {
            String propName = iter.next().toString();
            String propValue = requestData.optString(propName);
            if (propName.startsWith("where_")) {
                String key = propName.substring(propName.indexOf("_") + 1);
                Filter filter = new FilterPredicate(key, FilterOperator.EQUAL, propValue);
                filters.add(filter);
            } else if (propName.startsWith("update_")) {
                String prop = propName.substring(propName.indexOf("_") + 1);
                String value = requestData.optString(propName);
                propNames.add(prop);
                propValues.add(value);
            }
        }
        //Filter apiFilter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        //filters.add(apiFilter);
        Datastore.updateMultipeEntities(fakeEntityName, propNames.toArray(new String[propNames.size()]),
                propValues.toArray(new String[propValues.size()]), filters.toArray(new Filter[filters.size()]));
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);

    }

    @Endpoint(name = "delete")
    public void delete(Server serv, ClientWorker worker) {
        //kind=Person, where_Age = 30, where_Name = connie
        JSONObject requestData = worker.getRequestData();
        String realEntityName = requestData.optString("kind");
        String apiKey = requestData.optString("api_key");
        String fakeEntityName = getEntityFakeName(realEntityName, apiKey);
        if (!checkAPIKey(apiKey, worker, serv)) {
            return;
        }
        Iterator iter = requestData.keys();
        ArrayList<Filter> filters = new ArrayList();
        while (iter.hasNext()) {
            String propName = iter.next().toString();
            String propValue = requestData.optString(propName);
            if (propName.startsWith("where_")) {
                String key = propName.substring(propName.indexOf("_") + 1);
                Filter filter = new FilterPredicate(key, FilterOperator.EQUAL, propValue);
                filters.add(filter);
            }
        }
        //Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        //filters.add(filter);
        List propNames = Datastore.getEntityPropNames(fakeEntityName);
        Datastore.deleteMultipleEntities(fakeEntityName, filters.toArray(new Filter[filters.size()]));
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
        trackEntityStats(new String[]{realEntityName,fakeEntityName}, apiKey, "delete",propNames);
    }

    @Endpoint(name = "get")
    public void get(Server serv, ClientWorker worker) throws IOException {
        //kind=Person, where_Age = 30, where_Name = connie
        JSONObject requestData = worker.getRequestData();
        boolean filterMeta = requestData.optBoolean("filter_meta",true);
        String realEntityName = requestData.optString("kind");
        String apiKey = requestData.optString("api_key");
        String fakeEntityName = getEntityFakeName(realEntityName, apiKey);
        String view = requestData.optString("view");
        if (!checkAPIKey(apiKey, worker, serv)) {
            return;
        }
        Iterator iter = requestData.keys();
        ArrayList<Filter> filters = new ArrayList();
        while (iter.hasNext()) {
            String propName = iter.next().toString();
            String propValue = requestData.optString(propName);
            if (propName.startsWith("where_")) {
                String key = propName.substring(propName.indexOf("_") + 1);
                Filter filter = new FilterPredicate(key, FilterOperator.EQUAL, propValue);
                filters.add(filter);
            }
        }
       // Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        //filters.add(filter);
        List<Entity> multipleEntities = orderOnTimestamp(Datastore.getMultipleEntitiesAsList(fakeEntityName, filters.toArray(new Filter[filters.size()])));
        //order on timestamp 
        if(view.equals("html")){
            prettyView(multipleEntities,worker);
            return;
        }
        JSONObject data = Datastore.entityToJSON(multipleEntities);
        //data.remove("API_KEY");
        if(filterMeta){ //remove meta data
            data.remove("ID___");
            data.remove("TIMESTAMP___");
        }
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }
    
    private List<Entity> orderOnTimestamp(List<Entity> multipleEntities){
        Comparator<Entity> compare = new Comparator<Entity>() {
            @Override
            public int compare(Entity en1, Entity en2) {
                Long timestamp1 = (Long)en1.getProperty("TIMESTAMP___");
                Long timestamp2 = (Long)en2.getProperty("TIMESTAMP___");
                return timestamp1.intValue() - timestamp2.intValue();
            }
        };
        Collections.sort(multipleEntities, compare);
        return multipleEntities;
    }
    
    private void prettyView(Iterable<Entity> multipleEntities,ClientWorker worker) throws IOException{
        StringBuilder table = new StringBuilder("<table border=1 cellspacing=0 cellpadding=5 width=100%>");
        int count = 0;
        for(Entity en : multipleEntities){
            if(count == 0){
                StringBuilder headerTR = new StringBuilder("<tr>");
                Iterator props = en.getProperties().keySet().iterator();
                while (props.hasNext()) {
                    String propName = props.next().toString();
                    //if(propName.equals("API_KEY")) continue;
                    headerTR.append("<th>").append(propName).append("</th>");
                }
                
                headerTR.append("</tr>");
                table.append(headerTR);
            }
            count++;
            Map<String, Object> properties = en.getProperties();
            Iterator props = properties.keySet().iterator();
            StringBuilder tr = new StringBuilder("<tr>");
            while(props.hasNext()){
                String propName = props.next().toString();
                //if(propName.equals("API_KEY")) continue;
                String propValue = properties.get(propName).toString();
                tr.append("<td>").append(propValue).append("</td>");
            }
            tr.append("</tr>");
            table.append(tr);
        }
        worker.getResponse().getWriter().print(table);
    }
    
    @Endpoint(name="e_view")
    public void entityView(Server serv, ClientWorker worker) throws IOException{
        //fetch the entities 
        JSONObject requestData = worker.getRequestData();
        String apiKey = requestData.optString("api_key");
        if (!checkAPIKey(apiKey, worker, serv)) {
            return;
        }
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Iterable<Entity> multipleEntities = Datastore.getMultipleEntities("ENTITY_STATS", filter);
        StringBuilder html = new StringBuilder("");
        for(Entity en : multipleEntities){
            String name = en.getProperty("ENTITY_NAME").toString();
            String url = "/server?api_key="+apiKey+"&svc=open_data&msg=get&kind="+name+"&view=html";
            String newEnUrl = "/server?api_key="+apiKey+"&svc=open_data&msg=new_en&kind="+name+"";
            html.append("<a href=").append(url).append(">").append(name).append("</a>&nbsp&nbsp");
            html.append("<a href=").append(newEnUrl).append(">").append("New ").append(name).append("</a><br>");
        }
        worker.getResponse().getWriter().print(html);
    }
    

    
    @Endpoint(name="new_en")
    public void newEntity(Server serv, ClientWorker worker) throws IOException{
        JSONObject requestData = worker.getRequestData();
        String apiKey = requestData.optString("api_key");
        if (!checkAPIKey(apiKey, worker, serv)) {
            return;
        }
        String realEntityName = requestData.optString("kind");
        String fakeEntityName = getEntityFakeName(realEntityName, apiKey);
        
        List<Entity> list = Datastore.getAllEntitiesAsList(fakeEntityName, FetchOptions.Builder.withLimit(1));
        Entity en = list.get(0);
        if(en != null){
            //send the properties of the list as input texts and a submit button
            String action = "<form method='get' action='/server'>";
            StringBuilder html = new StringBuilder(action);
            Map<String, Object> properties = en.getProperties();
            Iterator<String> iter = properties.keySet().iterator();
            html.append("<table>");
            while(iter.hasNext()){
                String key = iter.next();
                //if(key.equals("API_KEY")) continue;
                String input = "<tr><td><label>"+key+"</label>:</td><td><input type='text' name='"+key+"'></td></tr>";
                html.append(input);
            }
            html.append("</table>");
            html.append("<input type='hidden' value='").append(apiKey).append("' name='api_key'>");
            html.append("<input type='hidden' value='").append(realEntityName).append("' name='kind'>");
            html.append("<input type='hidden' value='open_data' name='svc'>");
            html.append("<input type='hidden' value='save' name='msg'>");
            html.append("<input type='submit' value='Save'>");
            html.append("</form>");
            worker.getResponse().getWriter().print(html);
        }
    }
    
    @Endpoint(name="multi_join")
    public void multiJoin(Server serv, ClientWorker worker){
        JSONObject requestData = worker.getRequestData();
        String apiKey = requestData.optString("api_key");
        //kind1 = Driver, kind2 = Offenses, kind3 = 
        //join_prop1 = ID_NO, join_prop2 = ID_NO
        if (!checkAPIKey(apiKey, worker, serv)) return;
        int count = 1; //we start from 1
        ArrayList<String> joinProps = new ArrayList();
        ArrayList<String> kinds = new ArrayList();
        ArrayList<String> sortProps = new ArrayList();
        ArrayList<SortDirection> dirs = new ArrayList();
        while(true){
            String kind = requestData.optString("kind"+count, null);
            if(kind == null) break; //well no more kinds so just break
            String joinProp = requestData.optString("join_prop"+count);
            sortProps.add("TIMESTAMP___");
            dirs.add(SortDirection.ASCENDING);
            String fakeName = getEntityFakeName(kind, apiKey);
            kinds.add(fakeName);
            joinProps.add(joinProp);
            count++;
        }
        ArrayList<ArrayList<Filter>> allFilters = new ArrayList();
        for(int x = 1; x < kinds.size() + 1; x++){
            Iterator<String> iter = requestData.keys();
            ArrayList<Filter> kindFilter = new ArrayList();
            while(iter.hasNext()){
                String propName = iter.next();
                String propValue = requestData.optString(propName);
                String key = propName.substring(propName.indexOf("_") + 1);
                Filter filter = new FilterPredicate(key, FilterOperator.EQUAL, propValue);
                if(propName.startsWith("where"+x+"_")){
                    io.out("key : "+key+" value : "+propValue);
                    kindFilter.add(filter);
                }
            }
            allFilters.add(kindFilter);
            //where1_name, where1_age
            //where2_type, where2_id
        }
        
        Filter[][] filters = new Filter[allFilters.size()][];
        for (int i = 0; i < allFilters.size(); i++) {
            ArrayList<Filter> row = allFilters.get(i);
            filters[i] = row.toArray(new Filter[row.size()]);
        }
        
        String [] entityNames = kinds.toArray(new String[kinds.size()]);
        String [] sProps = sortProps.toArray(new String[sortProps.size()]);
        SortDirection [] sDirs = dirs.toArray(new SortDirection[dirs.size()]);
       
        String [] jProps = joinProps.toArray(new String[joinProps.size()]);
        JSONObject json = Datastore.entityToJSON(Datastore.multiJoin(entityNames, jProps, sProps,sDirs, filters));
        serv.messageToClient(worker.setResponseData(json));
    }
    
    //this join only supports two way joins
    @Endpoint(name="two_way_join")
    public void twoWayJoin(Server serv, ClientWorker worker) throws IOException{
        //join on two entities
        //where1_name=sam , where2_name=connie, kind1=Person, kind2=Driver
        JSONObject requestData = worker.getRequestData();
        String apiKey = requestData.optString("api_key");
        String join1 = requestData.optString("join_prop1");
        String join2 = requestData.optString("join_prop2");
        String view = requestData.optString("view");
        String realEntityName1 = requestData.optString("kind1");
        String fakeEntityName1 = getEntityFakeName(realEntityName1, apiKey);
        String realEntityName2 = requestData.optString("kind2");
        String fakeEntityName2 = getEntityFakeName(realEntityName2, apiKey);
        
        if (!checkAPIKey(apiKey, worker, serv)) return;
        Iterator iter = requestData.keys();
        ArrayList<Filter> filters1 = new ArrayList();
        ArrayList<Filter> filters2 = new ArrayList();
        while (iter.hasNext()) {
            String propName = iter.next().toString();
            String propValue = requestData.optString(propName);
            String key = propName.substring(propName.indexOf("_") + 1);
            Filter filter = new FilterPredicate(key, FilterOperator.EQUAL, propValue);
            if (propName.startsWith("where1_")) { //filters of the first entity
                filters1.add(filter); //this is a 
            }
            else if(propName.startsWith("where2_")){
                filters2.add(filter);
            }
        }
        //Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        //filters1.add(filter);//add the filter for the specific api key
        //filters2.add(filter);
        String [] entityNames = new String[]{fakeEntityName1,fakeEntityName2};
        String [] joinProps = new String[]{join1,join2};
        String [] sortProps = new String[]{"TIMESTAMP___","TIMESTAMP___"};
        SortDirection [] dirs = new SortDirection[]{SortDirection.ASCENDING,SortDirection.ASCENDING};
        List<Entity> list = Datastore.twoWayJoin(entityNames, joinProps, sortProps,dirs, 
                filters1.toArray(new Filter[filters1.size()]), 
                filters2.toArray(new Filter[filters2.size()]));
        if (view.equals("html")) {
            prettyView(list, worker);
            return;
        }
        JSONObject data = Datastore.entityToJSON(list);
        worker.setResponseData(data);
        serv.messageToClient(worker);
        
    }
    
    private String getEntityFakeName(String kind,String apiKey){
        Filter filter = new FilterPredicate("API_KEY", FilterOperator.EQUAL, apiKey);
        Filter filter1 = new FilterPredicate("ENTITY_NAME", FilterOperator.EQUAL, kind);
        Entity en = Datastore.getSingleEntity("ENTITY_STATS", filter,filter1);
        if(en !=  null){
            return en.getProperty("ENTITY_NAME_FAKE").toString();
        }
        return "";
    }
    
}
