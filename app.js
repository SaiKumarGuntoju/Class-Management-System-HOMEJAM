const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

let database = null;
const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, "dataBase.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at Port 3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//middleware function

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRET", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//registering the instructor

app.post("/register/", async (request, response) => {
  const { username, password, name, instructorId } = request.body;
  const isInstructorRegisteredQuery = `
            SELECT *
            FROM user
            WHERE username = '${username}';`;
  const isInstructorRegistered = await database.get(
    isInstructorRegisteredQuery
  );
  if (isInstructorRegistered === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createInstructorQuery = `
            INSERT INTO user
            (name,username,password,instructorId)
            VALUES 
           ( '${name}',
           '${username}',
            '${hashedPassword}',
            '${gender}')
            `;
      await database.run(createInstructorQuery);
      response.send("Instructor created successfully");
    }
  } else {
    response.status(400);
    response.send("Instructor already exists");
  }
});

//login the user

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const isInstructorFoundQuery = `
            SELECT * 
            FROM user
            WHERE username = '${username}';`;
  const isInstructorFound = await database.get(isInstructorFoundQuery);
  if (isInstructorFound === undefined) {
    response.status(400);
    response.send("Invalid Instructor");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      isUserFound.password
    );
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET");
      response.send({ jwtToken });
      //console.log({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});


//CRUD endpoints for instructors 
//to manage their Classes

//API TO CREATE NEW CLASS 


app.post("/classes/", async (request,response) =>{
    const {class_id,class_name,instructor_name,instructor_id} = request.body;
    const isClassAlreadyExit = `
        SELECT *
        FROM class_table
        WHERE class_id = ${class_id};`;
    const isClassFound = await database.get(isClassAlreadyExit);
    if (isClassFound !== undefined) {
        response.status(400)
        response.send(`Class with ${class_id} Already exits`)
    }else{
        const createNewClassQuery = `
            INSERT INTO
                class_table (class_id,class_name,instructor_name,instructor_id)
            VALUES (${class_id},'${class_name}','${instructor_name}',${instructor_id});
            `;
        await database.run(createNewClassQuery)
        response.status(200);
        response.send(`New Class with ${class_id} is Created successfully`);
    }
});

app.get("/classes/:classId", async (request,response) => {
    const {classId} = request.params;
    const getClassDetailsQuery = `
        SELECT *
        FROM class_table
        WHERE class_id = ${classId};`;
    const classDetails = database.get(getClassDetailsQuery);
    response.status(200)
    response.send(classDetails)
})

//CRUD endpoints for teacher to manage
//student participating in the Class

const convertDBtoResponseObject = (eachStudent) => {
  return {
    studentId: eachStudent.studentId,
    Student_Name: eachStudent.Student_Name,
    class_id: eachStudent.class_id,
  };
};

// API TO GET ALL STUDENTS DETAILS

app.get("/students/", async (request, response) => {
  const getAllStudentsQuery = `
            SELECT *
            FROM student_table;`;
  const studentsList = await database.all(getAllStudentsQuery);
  response.send(
    studentsList.map((eachStudent) => convertDBtoResponseObject(eachStudent))
  );
});


//API TO CREATE NEW STUDENT PROFILE

app.post("/students/", async (request,response) =>{
    const {Student_Name,class,father_Name,age} = request.body;
    const createStudentQuery = `
            INSERT INTO student_table
            (student_Name,father_Name,class,age)
            VALUES 
            ('${student_Name}',
            '${father_Name}',
            '${class}',
            '${age}');`;
    await database.run(createStudentQuery)
    response.status(200);
    response.send("Student created Successfully")
});

//API TO GET STUDENT DETAILS BASED ON STUDENT_ID

app.get("/students/:studentId/", async (request,response) => {
    const {studentId} = request.params;
    const getStudentQuery = `
            SELECT *
            FROM student_table;`;
    const studentDetails = await database.get(getStudentQuery);
    response.send(studentDetails);
});

//API TO UPDATE THE STUDENT DETAILS BASED ON STUDENT_ID

app.put("/students/:studentId/", async (request,response) => {
    const {student_Name,class} = request.body;
    const {studentId} = request.params;
    const updateStudentDetailsQuery = `
            UPDATE 
                student_table
            SET
                student_Name = '${student_Name}',
                class = '${class}'
            WHERE 
                student_id = ${studentId};`;
    await database.run(updateStudentDetailsQuery);
    response.send("Student Details Updated Successfully");
});

//API TO DELETE THE STUDENT BASED ON STUDENT_ID 

app.delete("/student/:studentId/", async (request,response) => { 
    const {student_id} = request.params;
    const deleteStudentQuery = `
        DELETE FROM 
            student_table
        WHERE 
            student_id = ${studentId};`;
    await database.run(deleteStudentQuery);
    response.send("Student is  Removed")
})

module.exports = app;
