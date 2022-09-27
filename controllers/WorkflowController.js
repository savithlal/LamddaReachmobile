var connection = require("../db");
const unserialize = require("phpunserialize");
const controller = require("../controllers/ContactController");
var axios = require("axios").default;
var config = require("../config.json");

const getBusinessProcess = async (id, fields) => {
  let fieldCopy = fields;
  fields = JSON.stringify(Object.keys(fields));
  fields = fields.replace(/^\[(.+)\]$/, "$1");
  var query = `SELECT BP_ID,Operator,Field FROM terminate_business_process WHERE Field IN (${fields});`;
  return new Promise(async (resolve, reject) => {
    await getData(id, query, fieldCopy, fields).then(async (data) => {
      await axios
        .post(config.WORKFLOW_URL, data)
        .then((response) => resolve(response.data))
        .catch((err) => reject(err));
    });
  });
};

const getWorkflowData = async (query) => {
  return new Promise((resolve, reject) => {
    connection.query(query, async function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getWorkflow = async (id, processId) => {
  var query = `SELECT ID,DOCUMENT_ID,ENTITY,MODULE_ID FROM b_bp_workflow_state WHERE STATE = 'InProgress' AND WORKFLOW_TEMPLATE_ID = ${processId} AND DOCUMENT_ID = "CONTACT_${id}"`;
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const mapWorkflow = async (id, data, fieldCopy) => {
  var terminateData = [];
  return new Promise(async (resolve, reject) => {
    for (let key in data) {
      let processId = data[key].BP_ID,
        operator = data[key].Operator;
      var temp = unserialize(operator);
      operator = temp[0];
      let field = temp[1].split("'")[1];
      if (field) {
        let str = `"${fieldCopy[data[key].Field]}" ${operator}= "${field}"`;
        try {
          if (eval(str) === true) {
            var data = await getWorkflow(id, processId);
            if (data.length) terminateData.push();
          }
        } catch (err) {
          reject(err);
        }
      }
    }
    resolve(terminateData);
  });
};

const getData = async (id, query, fieldCopy, fields) => {
  return new Promise(async (resolve, reject) => {
    var data = [];
    data = await getWorkflowData(query, fields);
    var terminateData = [],
      startData = [];
    if (data.length) terminateData = await mapWorkflow(id, data, fieldCopy);
    fields = fields.replace(new RegExp(",", "g"), "|");
    query = `SELECT bp_id,NAME FROM config cf INNER JOIN b_bp_workflow_template wf ON cf.bp_id = wf.ID WHERE cf.field REGEXP ${fields}`;
    startData = await startWorkflow(query);
    var response = await auditWorkflow(id, startData);
    await controller.execute([response]);
    resolve({
      response: {
        contactId: id,
        terminateData: terminateData,
        startData: startData,
      },
    });
  });
};

const startWorkflow = async (query) => {
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

const auditWorkflow = async (id, data) => {
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

module.exports = { getBusinessProcess };
