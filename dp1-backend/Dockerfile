FROM maven:3.9-amazoncorretto-21-alpine AS builder

WORKDIR /app
COPY pom.xml ./
COPY dp1-algoritmos/pom.xml ./dp1-algoritmos/pom.xml
COPY dp1-algoritmos/src ./dp1-algoritmos/src
RUN cd dp1-algoritmos && mvn install -q -DskipTests

COPY dp1-backend/pom.xml ./dp1-backend/pom.xml
COPY dp1-backend/src ./dp1-backend/src
RUN mvn package -pl dp1-backend -q -DskipTests

FROM amazoncorretto:21-alpine

WORKDIR /app
COPY --from=builder /app/dp1-backend/target/*.jar ./app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
