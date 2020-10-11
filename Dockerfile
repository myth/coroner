FROM python:3.7-slim-buster

WORKDIR /app

ADD requirements.txt .

RUN pip3 install -r requirements.txt && mkdir -p /data

COPY src/ ./

EXPOSE 8080

CMD ["python", "app.py"]
