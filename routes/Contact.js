var express = require("express");
var router = express.Router();
const controller = require("../controllers/ContactController");
const workflow = require("../controllers/WorkflowController");
const auth = require("./Verify");

router.get("/:id", auth, async function (req, res) {
  const instance = req.instance;
  var connection = require(`../db/db-${instance}`);
  const id = req.params.id;
  await controller.getContact(connection, res, id);
});

router.put("/", auth, async function (req, res) {
  const instance = req.instance;
  var connection = require(`../db/db-${instance}`);
  const tables = {
    b_uts_crm_contact: "VALUE_ID",
    b_crm_dynamic_items_179: "CONTACT_ID",
    b_crm_contact: "ID",
    audit_SPA: "contact_id",
    audit_contact: "contact_id",
    audit_business_process: "contact_id",
  };
  const id = req.body.vid;
  if (id == undefined) {
    controller.__return(res, {}, "CONTACT_ID_IS_REQUIRED", 422);
    return false;
  }
  var tempFields = req.body.properties;
  var misFields = {};
  if (!req.body.properties || !Object.keys(req.body.properties).length) {
    controller.__return(res, {}, "REQUIRED_FIELD_MISSING", 422);
    return false;
  }
  var temp = {};
  Object.keys(tempFields).forEach(async (field) => {
    await (temp[field.toLowerCase()] = tempFields[field]);
  });
  var fields = temp;
  var newFields = JSON.stringify(Object.keys(fields)).toLowerCase();
  newFields = newFields.replace(/^\[(.+)\]$/, "$1");
  const brand = await controller.getBrand(connection, res, id);
  const mapTables = async (tables, fields) => {
    var data = [];
    var auditData = [];
    let contactData = await controller.getContact(connection, res, id, true);
    let labels = await controller.getLabels(connection, fields);
    for (let table in tables) {
      var query = `DESCRIBE ${table}`;
      data[table] = await getFields(connection, query, fields);
      if (tables[table] !== "contact_id") {
        query = `SELECT * FROM ${table} WHERE ${tables[table]}=${id} LIMIT 1`;
        auditData[table] = await controller.auditFields(
          connection,
          query,
          fields
        );
      }
    }
    return {
      data: data,
      auditData: auditData,
      contactData: contactData,
      labels: labels,
    };
  };

  const getFields = (connection, query, fields) => {
    return new Promise((resolve, reject) => {
      connection.query(query, function (err, rows) {
        if (err) return reject(err);
        else {
          var temp = [];
          for (var i = 0; i < rows.length; i++) {
            let field = rows[i].Field;
            for (key in fields) {
              if (key == field) {
                temp.push(field);
                delete misFields[field];
                break;
              }
            }
          }
          resolve(temp);
        }
      });
    });
  };
  var query = `SELECT FIELDS_NAME as FIELD,LABEL_NAME as LABEL,TYPE FROM contact_updater WHERE LABEL_NAME IN (${newFields})`;
  await controller
    .mapFields(connection, res, query, fields)
    .then(async (response) => {
      fields = response.data;
      const reqFields = [
        "NAME",
        "LAST_NAME",
        "EMAIL",
        "PHONE",
        "UF_CRM_1337999932852",
      ];
      await controller.validate(res, fields, reqFields);
      misFields = Object.assign({}, response.data);
      if (misFields["EMAIL"] !== undefined) delete misFields.EMAIL;
      if (misFields["PHONE"] !== undefined) delete misFields.PHONE;
    })
    .then(async () => await mapTables(tables, fields))
    .then(async (response) => {
      let data = response.data;
      let auditData = response.auditData;
      let contactData = response.contactData;
      let labels = response.labels;
      return await controller.sql(
        res,
        tables,
        id,
        data,
        auditData,
        contactData,
        fields,
        misFields,
        labels
      );
    })
    .then(async (sql) => {
      return await controller.execute(connection, sql, false);
    })
    // .then(async (response) => {
    //   return await workflow.getBusinessProcess(
    //     connection,
    //     id,
    //     fields,
    //     brand,
    //     instance
    //   );
    // })
    .then(async (response) => {
      controller.__return(res, response, "RECORD_UPDATED_SUCCESSFULLY", 200);
    })
    .catch((err) => {
      console.log(err);
      controller.__return(res, {}, "EXECUTION_ERROR", 500);
    });
});

router.post("/", auth, async function (req, res) {
  const instance = req.instance;
  var connection = require(`../db/db-${instance}`);
  const date = new Date().toISOString().slice(0, 19).replace("T", " ");
  const tables = {
    b_crm_contact: [
      "CREATED_BY_ID",
      "ASSIGNED_BY_ID",
      "HAS_EMAIL",
      "HAS_PHONE",
    ],
    b_crm_dynamic_items_179: [
      "TITLE",
      "CREATED_BY",
      "CATEGORY_ID",
      "OPENED",
      "STAGE_ID",
      "CONTACT_ID",
      "UPDATED_BY",
      "MOVED_BY",
      "CREATED_TIME",
      "UPDATED_TIME",
      "MOVED_TIME",
      "BEGINDATE",
      "CLOSEDATE",
      "COMPANY_ID",
      "OPPORTUNITY",
      "TAX_VALUE",
      "OPPORTUNITY_ACCOUNT",
      "TAX_VALUE_ACCOUNT",
      "MYCOMPANY_ID",
      "SOURCE_DESCRIPTION",
      "WEBFORM_ID",
      "ASSIGNED_BY_ID",
    ],
    b_uts_crm_contact: ["VALUE_ID"],
    b_crm_field_multi: [
      "ENTITY_ID",
      "ELEMENT_ID",
      "TYPE_ID",
      "VALUE_TYPE",
      "COMPLEX_ID",
      "VALUE",
    ],
    b_crm_dp_comm_mcd: ["ENTITY_TYPE_ID", "ENTITY_ID", "TYPE", "VALUE"],
  };
  const staticValues = {
    b_crm_contact: {
      CREATED_BY_ID: 1,
      ASSIGNED_BY_ID: "",
      HAS_EMAIL: "Y",
      HAS_PHONE: "Y",
      DATE_CREATE: date,
    },
    b_crm_dynamic_items_179: {
      CREATED_BY: 1,
      UPDATED_BY: 1,
      MOVED_BY: 1,
      CATEGORY_ID: 2,
      OPENED: "N",
      STAGE_ID: "DT179_2:NEW",
      CREATED_TIME: date,
      UPDATED_TIME: date,
      MOVED_TIME: date,
      BEGINDATE: date,
      CLOSEDATE: date,
      COMPANY_ID: 1,
      OPPORTUNITY: 1,
      TAX_VALUE: 1,
      OPPORTUNITY_ACCOUNT: 1,
      TAX_VALUE_ACCOUNT: 1,
      MYCOMPANY_ID: 1,
      SOURCE_DESCRIPTION: 1,
      WEBFORM_ID: 1,
      ASSIGNED_BY_ID: 1,
    },
    b_crm_field_multi: {
      ENTITY_ID: "CONTACT",
      TYPE_ID: "PHONE",
      VALUE_TYPE: "WORK",
      COMPLEX_ID: "PHONE_WORK",
    },
    b_crm_dp_comm_mcd: {
      ENTITY_TYPE_ID: 3,
      TYPE: "PHONE",
    },
    b_uts_crm_contact: {},
  };
  var contactId;
  var data = tables;
  const reqFields = [
    "NAME",
    "LAST_NAME",
    "EMAIL",
    "PHONE",
    "UF_CRM_1337999932852",
  ];
  var tempFields = req.body.properties;
  var temp = {};
  Object.keys(tempFields).forEach(async (field) => {
    await (temp[field.toLowerCase()] = tempFields[field]);
  });
  var fields = temp;
  const misFields = Object.assign({}, fields);
  delete misFields["email"];
  delete misFields["phone"];
  var newFields = JSON.stringify(Object.keys(fields)).toLowerCase();
  newFields = newFields.replace(/^\[(.+)\]$/, "$1");
  const mapTables = (tables, head) => {
    return new Promise(async (resolve, reject) => {
      for (let table in tables) {
        var query = `DESCRIBE ${table}`;
        data[table].push(await getFields(connection, query, fields));
        data[table] = data[table].flat();
      }
      resolve({ data, head });
    });
  };

  const getFields = (connection, query, fields) => {
    return new Promise((resolve, reject) => {
      connection.query(query, function (err, rows) {
        if (err) return reject(err);
        else {
          var temp = [];
          for (var i = 0; i < rows.length; i++) {
            let field = rows[i].Field;
            for (key in fields) {
              if (key == field) {
                temp.push(field);
                delete misFields[field];
                break;
              }
            }
          }
          resolve(temp);
        }
      });
    });
  };

  const contactSql = (connection, query) => {
    return new Promise((resolve, reject) => {
      connection.query(query, function (err, rows) {
        if (err) reject(err);
        else {
          contactId = rows.insertId;
          resolve(contactId);
        }
      });
    });
  };
  var query = `SELECT FIELDS_NAME as FIELD,LABEL_NAME as LABEL,TYPE FROM contact_updater WHERE LABEL_NAME IN (${newFields})`;
  await controller
    .mapFields(connection, res, query, fields)
    .then(async (response) => {
      fields = response.data;
      return await controller.checkFields(res, fields, reqFields, response);
    })
    .then(async (errorFields) => {
      return await controller.getHead(connection, res, fields, errorFields);
    })
    .then(async (head) => {
      staticValues.b_crm_contact.ASSIGNED_BY_ID = head;
      return await mapTables(tables, head);
    })
    .then(async (response) => {
      return await controller.buildSql(response, fields, staticValues);
    })
    .then(async (response) => {
      await contactSql(connection, response.b_crm_contact);
      return response;
    })
    .then(async (response) => {
      return await controller.execute(connection, response, true, {
        search: "--CONTACT_ID--",
        replace: contactId,
      });
    })
    .then(async (response) => {
      controller.__return(
        res,
        { CONTACT_ID: contactId },
        "RECORD_CREATED_SUCCESSFULLY",
        201
      );
    })
    .catch((err) => {
      console.log(err);
      controller.__return(res, {}, "EXECUTION_ERROR", 500);
    });
});

module.exports = router;
