const unserialize = require("phpunserialize");
const controller = require("../controllers/ContactController");
const axios = require("axios").default;
var config = require("../config.json");

const getBusinessProcess = async (connection, id, fields, brand, instance) => {
  let fieldCopy = fields;
  fields = JSON.stringify(Object.keys(fields));
  fields = fields.replace(/^\[(.+)\]$/, "$1");
  var query = `SELECT BP_ID,Operator,Field FROM terminate_business_process WHERE Field IN (${fields});`;
  return new Promise(async (resolve, reject) => {
    await getData(connection, id, query, fieldCopy, fields).then(
      async (data) => {
        await startWorkflow(data, brand, instance);
        await terminateWorkflow(data, brand, instance);
        resolve();
      }
    );
  });
};

const getWorkflowData = async (connection, query) => {
  return new Promise((resolve, reject) => {
    connection.query(query, async function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getWorkflow = async (connection, id, processId) => {
  var query = `SELECT ID,DOCUMENT_ID,ENTITY,MODULE_ID FROM b_bp_workflow_state WHERE STATE = 'InProgress' AND WORKFLOW_TEMPLATE_ID = ${processId} AND DOCUMENT_ID = "CONTACT_${id}"`;
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const mapWorkflow = async (connection, id, workflowData, fieldCopy) => {
  var terminateData = [];
  return new Promise(async (resolve, reject) => {
    var data = workflowData;
    for (let key in data) {
      var processId = data[key] ? data[key].BP_ID : 0,
        operator = data[key] ? data[key].Operator : 0;
      if (operator) {
        var temp = unserialize(operator);
        operator = temp[0];
        let field = temp[1].split("'")[1];
        if (field) {
          let str = `"${fieldCopy[data[key].Field]}" ${operator}= "${field}"`;
          try {
            if (eval(str) === true) {
              var data = await getWorkflow(connection, id, processId);
              if (data.length) terminateData.push(data);
            }
          } catch (err) {
            reject(err);
          }
        }
      }
    }
    resolve(terminateData);
  });
};

const getData = async (connection, id, query, fieldCopy, fields) => {
  return new Promise(async (resolve, reject) => {
    var data = [];
    data = await getWorkflowData(connection, query, fields);
    var terminateData = [],
      startData = [];
    if (data.length)
      terminateData = await mapWorkflow(connection, id, data, fieldCopy);
    fields = fields.replace(new RegExp(",", "g"), "|");
    query = `SELECT bp_id,NAME FROM config cf INNER JOIN b_bp_workflow_template wf ON cf.bp_id = wf.ID WHERE cf.field REGEXP ${fields}`;
    startData = await getStartWorkflow(connection, query);
    var response = await auditWorkflow(connection, id, startData);
    await controller.execute(connection, [response]);
    resolve({
      response: {
        contactId: id,
        terminateData: terminateData,
        startData: startData,
      },
    });
  });
};

const getStartWorkflow = async (connection, query) => {
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, rows) {
      if (err) reject(err);
      else {
        var data = {};
        for (let row in rows) {
          data[rows[row].bp_id] = rows[row].NAME;
        }
        resolve(data);
      }
    });
  });
};

const auditWorkflow = async (connection, id, data) => {
  return new Promise((resolve, reject) => {
    var query =
      "INSERT INTO audit_business_process (contact_id, bp_id, workflow_name) VALUES ";
    for (let processId in data) {
      query += `(${id},"${processId}","${connection.escape(
        data[processId]
      )}"),`;
    }
    query = query.replace(/,+$/, "");
    resolve(query);
  });
};

const startWorkflow = (data, brand, instance) => {
  return new Promise((resolve, reject) => {
    var startData = data.response.startData;
    var id = data.response.contactId;
    var api =
      (config[instance].BRANDS[brand] ?? config[instance].BRANDS.default) +
      config[instance].ENDPOINTS.START;
    Object.keys(startData).map((processId) => {
      var params = {
        TEMPLATE_ID: processId,
        DOCUMENT_ID: ["crm", "CCrmDocumentContact", "CONTACT_" + id],
        PARAMETERS: null,
      };
      axios.post(api, params).catch((err) => console.log(err));
    });
    resolve();
  });
};

const terminateWorkflow = (data, brand, instance) => {
  return new Promise((resolve, reject) => {
    var terminateData = data.response.terminateData;
    var api =
      (config[instance].BRANDS[brand] ?? config[instance].BRANDS.default) +
      config[instance].ENDPOINTS.TERMINATE;
    Object.keys(terminateData).map((key) => {
      var params = {
        ID: terminateData[0][key].ID,
      };
      axios.post(api, params).catch((err) => console.log(err));
    });
    resolve();
  });
};

module.exports = { getBusinessProcess };
