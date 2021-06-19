const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { DefaultDeserializer } = require("v8");
const { isUndefined } = require("util");

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

//middleware function to validate instructor

const authenticateTokenForInstructor = (request, response, next) => {
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
          request.username = payload.username
        next();
      }
    });
  }
};

//registering the instructor

app.post("/register/", async (request, response) => {
  const { username, password, name ,gender } = request.body;
  const isInstructorRegisteredQuery = `
            SELECT *
            FROM instructor_table
            WHERE instructor_name = '${username}';`;
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
            (name,username,password,gender)
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
            FROM instructor_table
            WHERE instructor_username = '${username}';`;
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


app.post("/classes/",authenticateTokenForInstructor, async (request,response) =>{
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

//API TO GET THE DETAILS OF THE CLASS

app.get("/classes/:classId",authenticateTokenForInstructor, async (request,response) => {
    const {classId} = request.params;
    const getClassDetailsQuery = `
        SELECT *
        FROM class_table
        WHERE class_id = ${classId};`;
    const classDetails = database.get(getClassDetailsQuery);
    if (classDetails === undefined){
        response.status(400)
        response.send("Invalid ClassId")
    }else{
        response.status(200)
        response.send(classDetails)
}
})

//API TO UPDATE THE DETAILS OF THE CLASS

app.put("/classes/:classId",authenticateTokenForInstructor, async (request,response) => {
    const {classId} = request.params;
    const {username} = request;
    const {class_name,instructor_name,instructor_id} = request.body;
    const isClassExists = `
        SELECT *
        FROM class_table
        WHERE class_id = ${classId};`;
    const isClassFound = await database.get(isClassExists); 
    
    if(isClassFound === undefined){
        response.status(400);
        response.send("Invalid ClassId")
    }else{
        if (username === isClassFound.instructor_name){
            const UpdateClassQuery = `
                UPDATE class_table
                SET 
                    class_name = ${class_name},
                    instructor_name = '${instructor_name}',
                    instructor_id = ${instructor_id} 
                WHERE class_id = ${classId};`;
            await database.run(UpdateClassQuery);
            response.status(200);
            response.send(`Class Details of ${classId} are Successfully Updated`);
        }else{
            response.status(401);
            response.send("Permisson Denied to Update (Ownership Mismatched)")
        }
    }    
})

app.delete("classes/:classId",authenticateTokenForInstructor, async(request,response) => {
    const {classId} = request.params;
    const {username} = request;
    const isClassExists = `
        SELECT *
        FROM class_table
        WHERE class_id = ${classId};`;
    const isClassFound = await database.get(isClassExists);
    if (isClassFound === Undefined){
        response.status(400)
        response.send("Invalid classId")
    }else{
        if (username === isClassFound.instructor_name){
            const deleteQuery = `
                DELETE FROM class_table
                WHERE class_id = ${classId};`;
            await database.run(deleteQuery);
            response.status(200);
            response.send(`Class with ID ${classId} is Successfully Deleted`)
        }else{
            response.status(401);
            response.send("Permisson Denied to Update (Ownership Mismatched)")
        }
    }
})

//middleware function to validate Teacher

const authenticateTokenForTeacher = (request, response, next) => {
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
            request.username = payload.username
          next();
        }
      });
    }
  };
  
  //registering the Teacher
  
  app.post("/register/", async (request, response) => {
    const { username, password, name ,gender } = request.body;
    const isInstructorRegisteredQuery = `
              SELECT *
              FROM  teacher_table
              WHERE teacher_name = '${name}';`;
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
              (name,username,password,gender)
              VALUES 
             ( '${name}',
             '${username}',
              '${hashedPassword}',
              '${gender}')
              `;
        await database.run(createInstructorQuery);
        response.send("Teacher created successfully");
      }
    } else {
      response.status(400);
      response.send("Teacher already exists");
    }
  });
  
  //login the Teacher
  
  app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const isInstructorFoundQuery = `
              SELECT * 
              FROM teacher_table
              WHERE teacher_username = '${username}';`;
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
  



//CRUD endpoints for teacher to manage
//student participating in the Class

const convertDBtoResponseObject = (eachStudent) => {
  return {
    studentId: eachStudent.studentId,
    Student_Name: eachStudent.Student_Name,
    class_id: eachStudent.class_id,
    instructor_id:eachStudent.instructor_id,
    instructor_name:eachStudent.instructor_name
  };
};

// API TO GET ALL STUDENTS DETAILS

app.get("/students/",authenticateTokenForTeacher, async (request, response) => {
  const getAllStudentsQuery = `
            SELECT *
            FROM student_table;`;
  const studentsList = await database.all(getAllStudentsQuery);
  response.send(
    studentsList.map((eachStudent) => convertDBtoResponseObject(eachStudent))
  );
});


//API TO CREATE NEW STUDENT PROFILE

app.post("/students/",authenticateTokenForTeacher, async (request,response) =>{
    const {student_Name,father_Name,class_id} = request.body;
    const createStudentQuery = `
            INSERT INTO student_table
            (student_Name,father_Name,class_id)
            VALUES 
            ('${student_Name}',
            '${father_Name}',
            '${class_id}';`;
    await database.run(createStudentQuery)
    response.status(200);
    response.send("Student created Successfully")
});

//API TO GET STUDENT DETAILS BASED ON STUDENT_ID

app.get("/students/:studentId/",authenticateTokenForTeacher, async (request,response) => {
    const {studentId} = request.params;
    const getStudentQuery = `
            SELECT *
            FROM student_table
            WHERE student_id=${studentId};`;
    const studentDetails = await database.get(getStudentQuery);
    if (studentDetails === undefined){
        response.status(400)
        response.send("Student is not Found")
    }else{
        response.status(200)
        response.send(studentDetails);
    }
});

//API TO UPDATE THE STUDENT DETAILS BASED ON STUDENT_ID

app.put("/students/:studentId/",authenticateTokenForTeacher, async (request,response) => {
    const {student_Name,classId} = request.body;
    const {studentId} = request.params;
    const isStudentFoundQuery = `
            SELECT *
            FROM student_table
            WHERE student_id = ${studentId};`;
    const studentDetails = await database.get(isStudentFoundQuery);
    if (studentDetails === undefined){
        response.status(400);
        response.send("Student Profile Not Found")
    }else{
        const updateStudentDetailsQuery = `
                UPDATE 
                    student_table
                SET
                    student_Name = '${student_Name}',
                    class_id = '${classId}'
                WHERE 
                    student_id = ${studentId};`;
        await database.run(updateStudentDetailsQuery);
        response.send("Student Details Updated Successfully");
    }
});

//API TO DELETE THE STUDENT BASED ON STUDENT_ID 

app.delete("/student/:studentId/",authenticateTokenForTeacher, async (request,response) => { 
    const {student_id} = request.params;
    const isStudentFoundQuery = `
            SELECT *
            FROM student_table
            WHERE student_id=${studentId};`;
    const studentDetails = await database.get(isStudentFoundQuery);
    if (studentDetails === undefined){
        response.status(400)
        response.send("Student Profile Not Found to Delete")
    }else{
        const deleteStudentQuery = `
                DELETE FROM 
                    student_table
                WHERE 
                    student_id = ${studentId};`;
            await database.run(deleteStudentQuery);
            response.send("Student is  Removed")   
    }
})

//Students can see the list of classes they registered for....

app.get("/classes/registered/:studentId", async (request,response) => {
    const {studentId} = request.params;
    const GetRegisteredClasses = `
            SELECT *
            FROM student_table INNER JOIN instructor_table ON 
            student_table.class_id = instructor_table.class_id
            WHERE student_table.student_id = '${studentId}';`;
    const getRegisteredClassesOfStudent = await database.get(GetRegisteredClasses);
    response.status(200);
    response.send(getRegisteredClassesOfStudent);
});


module.exports = app;
