#  1\*\*.setup method\*\*





 PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject> python -m venv djvenv

PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject> djvenv\\scripts\\activate

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject> pip install django

Collecting django

  Using cached django-6.0.1-py3-none-any.whl.metadata (3.9 kB)

Collecting asgiref>=3.9.1 (from django)

  Using cached asgiref-3.11.0-py3-none-any.whl.metadata (9.3 kB)

Collecting sqlparse>=0.5.0 (from django)

  Using cached sqlparse-0.5.5-py3-none-any.whl.metadata (4.7 kB)

Collecting tzdata (from django)

  Using cached tzdata-2025.3-py2.py3-none-any.whl.metadata (1.4 kB)

Using cached django-6.0.1-py3-none-any.whl (8.3 MB)

Using cached asgiref-3.11.0-py3-none-any.whl (24 kB)

Using cached sqlparse-0.5.5-py3-none-any.whl (46 kB)

Using cached tzdata-2025.3-py2.py3-none-any.whl (348 kB)

Installing collected packages: tzdata, sqlparse, asgiref, django

Successfully installed asgiref-3.11.0 django-6.0.1 sqlparse-0.5.5 tzdata-2025.3



\[notice] A new release of pip is available: 25.2 -> 25.3

\[notice] To update, run: python.exe -m pip install --upgrade pip

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject> django-admin startproject ecomerseproject

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject> cd ecomerseproject

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject>  python manage.py startapp home

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject>

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> python manage.py runserver

Watching for file changes with StatReloader

Performing system checks...



System check identified no issues (0 silenced).



You have 18 unapplied migration(s). Your project may not work properly until you apply the migrations for app(s): admin, auth, contenttypes, sessions.

Run 'python manage.py migrate' to apply them.

January 07, 2026 - 02:32:19

Django version 6.0.1, using settings 'ecomerseproject.settings'

Starting development server at http://127.0.0.1:8000/

Quit the server with CTRL-BREAK.



WARNING: This is a development server. Do not use it in a production setting. Use a production WSGI or ASGI server instead.

* For more information on production servers see: https://docs.djangoproject.com/en/6.0/howto/deployment/









# 2.restart



(.venv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> python -m venv djvenv

(.venv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> djvenv\\scripts\\activate

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> pip install django

Requirement already satisfied: django in c:\\users\\romeo\\pycharmprojects\\ecomerseproject\\ecomerseproject\\djvenv\\lib\\site-packages (6.0.1)

Requirement already satisfied: asgiref>=3.9.1 in c:\\users\\romeo\\pycharmprojects\\ecomerseproject\\ecomerseproject\\djvenv\\lib\\site-packages (from django) (3.11.0)

Requirement already satisfied: sqlparse>=0.5.0 in c:\\users\\romeo\\pycharmprojects\\ecomerseproject\\ecomerseproject\\djvenv\\lib\\site-packages (from django) (0.5.5)

Requirement already satisfied: tzdata in c:\\users\\romeo\\pycharmprojects\\ecomerseproject\\ecomerseproject\\djvenv\\lib\\site-packages (from django) (2025.3)

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> django-admin startproject ecomerseproject

CommandError: 'C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject\\ecomerseproject' already exists

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject> python manage.py startapp home

CommandError: 'home' conflicts with the name of an existing Python module and cannot be used as an app name. Please try another name.

(djvenv) PS C:\\Users\\romeo\\PycharmProjects\\ecomerseproject\\ecomerseproject>  python manage.py runserver

Watching for file changes with StatReloader

Performing system checks...



System check identified no issues (0 silenced).



You have 18 unapplied migration(s). Your project may not work properly until you apply the migrations for app(s): admin, auth, contenttypes, sessions.

Run 'python manage.py migrate' to apply them.

January 07, 2026 - 15:34:45

Django version 6.0.1, using settings 'ecomerseproject.settings'

Starting development server at http://127.0.0.1:8











🐍 Django Full Notes

1\. What is Django?



Django is a high-level Python web framework used to build secure, scalable, and fast web applications.



Features:



Rapid Development



Secure



Scalable



Built-in Admin Panel



ORM (Object Relational Mapper)



Follows MVT Architecture



2\. Django Architecture – MVT

MVT	Description

Model	Handles database

View	Business logic

Template	UI (HTML)

Flow:



User → URL → View → Model → Template → Response



3\. Installing Django

pip install django





Check version:



django-admin --version



4\. Creating Django Project

django-admin startproject projectname

cd projectname

python manage.py runserver



5\. Creating Django App

python manage.py startapp appname





Add app to settings.py:



INSTALLED\_APPS = \['appname']



6\. Django Project Structure

File	Purpose

manage.py	Command-line utility

settings.py	Project settings

urls.py	URL routing

views.py	Logic

models.py	Database tables

admin.py	Admin panel

apps.py	App config

7\. Django Models



Models define database structure.



Example:



class Student(models.Model):

&nbsp;   name = models.CharField(max\_length=100)

&nbsp;   age = models.IntegerField()





Apply migrations:



python manage.py makemigrations

python manage.py migrate



8\. Django ORM



Used to interact with DB using Python instead of SQL.



Examples:



Student.objects.all()

Student.objects.create(name="Thameem", age=21)



9\. Django Views

Function-Based View:

def home(request):

&nbsp;   return HttpResponse("Hello Django")



Class-Based View:

from django.views import View

class Home(View):

&nbsp;   def get(self, request):

&nbsp;       return HttpResponse("Hello")



10\. URLs in Django

path('', views.home, name='home')



11\. Templates in Django



HTML files stored in templates/



Example:



<h1>Hello {{ name }}</h1>





Render:



return render(request, "home.html", {"name": "Thameem"})



12\. Static Files



Used for CSS, JS, Images.



settings.py:



STATIC\_URL = '/static/'



13\. Django Forms

Forms Example:

class StudentForm(forms.Form):

&nbsp;   name = forms.CharField()



ModelForm:

class StudentForm(forms.ModelForm):

&nbsp;   class Meta:

&nbsp;       model = Student

&nbsp;       fields = '\_\_all\_\_'



14\. Django Admin



Create superuser:



python manage.py createsuperuser





Register model:



admin.site.register(Student)



15\. Authentication in Django



Built-in system for:



Login



Logout



Signup



Permissions



16\. Django Middleware



Middleware is a layer between request and response.



Examples:



AuthenticationMiddleware



SessionMiddleware



17\. Django REST Framework (DRF)



Used to build APIs.



Install:



pip install djangorestframework





settings.py:



INSTALLED\_APPS = \['rest\_framework']



18\. DRF Serializer



Converts model to JSON.



class StudentSerializer(serializers.ModelSerializer):

&nbsp;   class Meta:

&nbsp;       model = Student

&nbsp;       fields = '\_\_all\_\_'



19\. API Views

@api\_view(\['GET'])

def student\_list(request):

&nbsp;   students = Student.objects.all()



20\. Django vs Flask

Django	Flask

Full framework	Micro framework

Built-in admin	No admin

ORM included	External ORM

Best for large apps	Best for small apps

21\. Security in Django



CSRF Protection



SQL Injection protection



XSS Protection



Secure authentication



22\. Deployment (Basic)



Use Gunicorn/UWSGI



Nginx server



Use PostgreSQL/MySQL



Set DEBUG=False



23\. Common Django Commands

Command	Purpose

runserver	Run project

makemigrations	Prepare DB

migrate	Apply DB

createsuperuser	Admin

collectstatic	Static files

24\. Django Interview Questions



What is Django ORM?



Difference between Django and Flask?



What is MVT?



What is middleware?



What is serializer?



What is REST API?

