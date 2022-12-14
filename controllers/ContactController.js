var config = require("../config.json");
const sql = async (
  res,
  tables,
  id,
  data,
  auditData,
  contactData,
  fields,
  misFields,
  labels
) => {
  return new Promise((resolve, reject) => {
    let errorFields = Object.keys(misFields);
    if (errorFields.length) {
      __return(res, {}, "INVALID_FIELDS: " + errorFields.toString(), 422);
      return false;
    }
    var sqlData = [];
    for (let table in tables) {
      if (data[table].length) {
        var sql = `UPDATE ${table} SET `;
        for (let field in data[table]) {
          fields[data[table][field]] =
            fields[data[table][field]] == null
              ? null
              : '"' + fields[data[table][field]] + '"';
          sql += `${data[table][field]}=${fields[data[table][field]]},`;
        }
        sql = sql.replace(/,+$/, "");
        sql += ` WHERE ${tables[table]}=${id}`;
        sqlData.push(sql);
      }
      if (
        auditData[table] !== undefined &&
        Object.keys(auditData[table]).length
      ) {
        var sql = `INSERT INTO ${
          table == "b_crm_dynamic_items_179" ? "audit_SPA" : "audit_contact"
        } (contact_id, field, before_value, after_value, contact_email, contact_name, field_name${
          table == "b_crm_dynamic_items_179" ? "" : ", type"
        }) VALUES `;
        for (let field in auditData[table]) {
          sql += `(${id},"${field}","${auditData[table][field]}","${
            fields[field]
          }","${contactData["EMAIL"]}","${contactData["FULL_NAME"]}","${
            labels[field] ?? field
          }"${table == "b_crm_dynamic_items_179" ? "" : ',"api"'}),`;
        }
        sql = sql.replace(/,+$/, "");
        sql = sql.replace(/""/g, '"');
        sqlData.push(sql);
      }
    }
    if (fields["PHONE"] !== undefined) {
      sqlData.push(
        `UPDATE b_crm_field_multi SET VALUE="+91${fields.PHONE}" WHERE ELEMENT_ID=${id} AND TYPE_ID="PHONE"`
      );
      sqlData.push(
        `UPDATE b_crm_dp_comm_mcd SET VALUE="+91${fields.PHONE}" WHERE ENTITY_ID=${id} AND TYPE="PHONE"`
      );
    }
    if (fields["EMAIL"] !== undefined) {
      sqlData.push(
        `UPDATE b_crm_field_multi SET VALUE="${fields.EMAIL}" WHERE ELEMENT_ID=${id} AND TYPE_ID="EMAIL"`
      );
      sqlData.push(
        `UPDATE b_crm_dp_comm_mcd SET VALUE="${fields.EMAIL}" WHERE ENTITY_ID=${id} AND TYPE="EMAIL"`
      );
    }
    resolve(sqlData);
  });
};

const execute = async (connection, sql, type, flag, data) => {
  return new Promise((resolve, reject) => {
    if (type !== "workflow")
      sql[
        "b_crm_access_attr_contact"
      ] = `INSERT INTO b_crm_access_attr_contact (CATEGORY_ID,USER_ID,IS_OPENED,IS_ALWAYS_READABLE,PROGRESS_STEP,ENTITY_ID) VALUES (0,1,'Y','N','','--CONTACT_ID--')`;
    if (flag) {
      delete sql.b_crm_contact;
      delete sql.b_crm_dynamic_items_179;
    }
    for (i in sql) {
      let query = sql[i];
      if ((flag || i == "b_crm_access_attr_contact") && type !== "workflow") {
        var r = new RegExp(data.search.contactId, "g");
        query = query.replace(r, data.replace.contactId);
        if (data.search.spaId) {
          var r = new RegExp(data.search.spaId, "g");
          query = query.replace(r, data.replace.spaId);
        }
      }
      connection.query(query, function (err, rows) {
        if (err) reject(err);
        else resolve();
      });
    }
  });
};

const __return = async (res, data, message, status) => {
  let response = {
    status: String(status)[0] == 2 ? true : false,
    message: message,
    data: data ?? {},
  };
  await res.status(status).json(response);
};

const getHead = async (res, fields, errorFields, instance) => {
  return new Promise((resolve, reject) => {
    if (errorFields.length) {
      __return(res, {}, "REQUIRED_FIELDS: " + errorFields.toString(), 422);
      return false;
    }
    resolve(config[instance]["RESPONSIBLE"][fields["UF_CRM_1337999932852"]]);
  });
};

const getContact = (connection, res, id, flag) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT contact.ID,CONCAT(NAME," ",LAST_NAME) AS FULL_NAME,NAME,LAST_NAME,multi.VALUE as EMAIL FROM b_crm_contact contact INNER JOIN b_crm_field_multi multi ON contact.ID = multi.ELEMENT_ID WHERE contact.ID=${id} AND multi.TYPE_ID="EMAIL" LIMIT 1`;
    connection.query(query, function (err, rows) {
      if (err) __return(res, {}, "EXECUTION_ERROR", 500);
      else {
        flag
          ? !rows.length
            ? __return(res, {}, "Contact not found", 200)
            : resolve(rows[0])
          : !rows.length
          ? __return(res, {}, "Contact not found", 200)
          : __return(res, rows[0], "Contact listed successfully", 200);
      }
    });
  });
};

const checkFields = async (res, fields, reqFields) => {
  return new Promise(async (resolve, reject) => {
    fields = Object.keys(fields);
    for (var i = 0; i < fields.length; i++) {
      let field = fields[i];
      for (key in reqFields) {
        if (reqFields[key] == field.toUpperCase()) {
          reqFields.splice(key, 1);
          break;
        }
      }
    }
    await validate(res, fields, reqFields);
    resolve(reqFields);
  });
};

const buildSql = (response, fields, staticValues) => {
  return new Promise((resolve, reject) => {
    var sqlData = {};
    for (let table in response.data) {
      var tableFields = response.data[table];
      if (response.data[table].length) {
        var sql = `INSERT INTO ${table} (${response.data[
          table
        ].toString()}) VALUES (`;
        if (table == "b_crm_field_multi") {
          sql += `"CONTACT","--CONTACT_ID--","EMAIL","WORK","EMAIL_WORK","${fields.EMAIL}"`;
          if (fields.PHONE !== undefined)
            sql += `),("CONTACT","--CONTACT_ID--","PHONE","WORK","PHONE_WORK","+91${fields.PHONE}"`;
        } else if (table == "b_crm_dp_comm_mcd") {
          sql += `3,"--CONTACT_ID--","EMAIL","${fields.EMAIL}"`;
          if (fields.PHONE !== undefined)
            sql += `),(3,"--CONTACT_ID--","PHONE","+91${fields.PHONE}"`;
        } else {
          for (let key in tableFields) {
            var field = tableFields[key];
            var value = "";
            value =
              fields[field] ?? staticValues[table][field] ?? "--CONTACT_ID--";
            switch (table) {
              case "b_crm_dynamic_items_179":
                if (field == "TITLE")
                  value = fields.NAME + " " + fields.LAST_NAME;
                break;
              default:
                break;
            }
            sql += `"${value}", `;
          }
        }
        sql = sql.replace(/,\s*$/, "");
        sql += ")";
        sqlData[table] = sql;
      }
    }
    resolve(sqlData);
  });
};

const auditFields = async (connection, query, fields) => {
  let auditData = [];
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, rows) {
      if (err) reject(err);
      else {
        rows = rows[0];
        for (let row in rows) {
          if (fields[row] !== undefined) auditData[row] = rows[row];
        }
        resolve(auditData);
      }
    });
  });
};

const getLabels = async (connection, fields) => {
  fields = JSON.stringify(Object.keys(fields));
  fields = fields.replace(/^\[(.+)\]$/, "$1");
  let query = `SELECT LIST_FILTER_LABEL,EDIT_FORM_LABEL FROM b_user_field_lang WHERE LIST_FILTER_LABEL IN (${fields});`;
  let data = [];
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, rows) {
      if (err) reject(err);
      else {
        for (let row in rows) {
          data[rows[row]["LIST_FILTER_LABEL"]] = rows[row]["EDIT_FORM_LABEL"];
        }
        resolve(data);
      }
    });
  });
};

const mapFields = async (connection, res, query, fields) => {
  return new Promise((resolve, reject) => {
    connection.query(query, async (err, rows) => {
      if (err) reject(err);
      else {
        var codes = {};
        var data = {};
        for (var i in rows) {
          codes[rows[i].LABEL] = rows[i].FIELD;
        }
        if (Object.keys(codes).length !== Object.keys(fields).length) {
          var errFields = [];
          for (var i in fields) {
            if (!codes[i]) errFields.push(i);
          }
          __return(res, {}, "UNKNOWN_FIELD: " + errFields.toString(), 422);
        } else {
          var processedData = await processEnumFields(connection, rows, fields);
          if (processedData.status == true && processedData.data == false) {
            for (i in rows) {
              data[rows[i].FIELD.toUpperCase()] = fields[rows[i].LABEL];
            }
            resolve({ status: true, data: data });
          }
          if (!processedData.status === true)
            __return(
              res,
              {},
              "PLEASE_PASS_CORRECT_PARAMETER: " +
                Object.keys(processedData.data).toString(),
              422
            );
          else {
            processedData = processedData.data;
            for (i in rows) {
              data[rows[i].FIELD.toUpperCase()] =
                processedData[rows[i].FIELD] ?? fields[rows[i].LABEL];
            }
            resolve({ status: true, data: data });
          }
        }
      }
    });
  });
};

const validate = async (res, fields, reqFields) => {
  return new Promise((resolve, reject) => {
    var data = [];
    reqFields.map((field) => {
      if (fields[field] !== undefined && fields[field] === "") {
        var temp = field;
        if (field == "UF_CRM_1337999932852") temp = "BRAND_NAME";
        if (field == "NAME") temp = "FIRSTNAME";
        data.push(temp);
      }
    });
    if (data.length)
      __return(res, {}, "REQUIRED_FIELDS: " + data.toString(), 422);
    else resolve(data);
  });
};

const getBrand = async (connection, res, id) => {
  return new Promise((resolve, reject) => {
    var query = `SELECT UF_CRM_1337999932852 as BRAND_NAME FROM b_uts_crm_contact WHERE VALUE_ID=${id} LIMIT 1`;
    connection.query(query, (err, rows) => {
      if (err) __return(res, {}, "NO_BRAND_FOUND", 422);
      else resolve(rows[0].BRAND_NAME);
    });
  });
};

const processEnumFields = async (connection, rows, fields) => {
  var enumData = {};
  var enumFields = {};
  var errorFields = [];
  var enumFlag = false;
  for (i in rows) {
    if (rows[i].TYPE == "enumeration") {
      enumFlag = true;
      fields[rows[i].LABEL] == undefined ? (fields[rows[i].LABEL] = null) : "";
      enumData['"' + rows[i].FIELD + '"'] =
        fields[rows[i].LABEL] == null
          ? null
          : '"' + fields[rows[i].LABEL] + '"';
      enumFields[rows[i].FIELD] = fields[rows[i].LABEL];
    }
  }
  if (!enumFlag) return { status: true, data: false };
  if (errorFields.length) return { status: false, data: errorFields };
  else {
    var enumDataArr;
    enumDataArr = Object.values(enumData).filter(function (el) {
      return el != null;
    });
    var processed = [];
    if (Object.keys(enumDataArr).length)
      processed = await mapEnumFields(connection, enumData, enumFields);
    var status = Object.keys(processed.errorProcessedData).length
      ? false
      : true;
    var data = Object.keys(processed.errorProcessedData).length
      ? processed.errorProcessedData
      : processed.processedData;
    return { status: status, data: data };
  }
};

const mapEnumFields = (connection, enumData, enumFields) => {
  return new Promise(async (resolve, reject) => {
    var fields = Object.keys(enumData).toString();
    var values = Object.values(enumData).toString();
    var query = `SELECT f.FIELD_NAME,label_value,e.ID from b_user_field_enum e INNER JOIN b_user_field f ON e.user_field_id = f.id WHERE f.field_name IN (${fields}) and label_value IN (${values})`;
    connection.query(query, (err, rows) => {
      if (err) reject(err);
      var processedData = [];
      var errorProcessedData = [];
      if (rows.length < Object.keys(enumData).length) {
        errorProcessedData = enumFields;
        for (i in rows) {
          var temp = Object.keys(enumFields);
          if (temp.includes(rows[i].FIELD_NAME))
            delete errorProcessedData[rows[i].FIELD_NAME];
        }
        resolve({
          processedData: processedData,
          errorProcessedData: errorProcessedData,
        });
        return;
      }
      for (i in rows) {
        var fieldVal = enumFields[rows[i].FIELD_NAME];
        fieldVal =
          typeof fieldVal == "boolean"
            ? fieldVal
              ? "true"
              : "false"
            : fieldVal;
        if (
          fieldVal.toString().toUpperCase() == rows[i].label_value.toUpperCase()
        )
          processedData[rows[i].FIELD_NAME] = rows[i].ID;
        else if (
          processedData.length &&
          processedData[rows[i].FIELD_NAME] == undefined
        )
          errorProcessedData[rows[i].FIELD_NAME] = 1;
      }
      resolve({
        processedData: processedData,
        errorProcessedData: errorProcessedData,
      });
    });
  });
};

const checkEmailFormat = async (email) => {
  return new Promise((resolve, reject) => {
    var re =
      /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    re.test(email) ? resolve({ status: 1 }) : resolve({ status: 0 });
  });
};

module.exports = {
  sql,
  execute,
  __return,
  getHead,
  getContact,
  checkFields,
  buildSql,
  auditFields,
  getLabels,
  mapFields,
  validate,
  getBrand,
  checkEmailFormat,
};
