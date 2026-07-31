from setuptools import find_packages, setup

setup(
    name="medical_chatbot",
    version="0.1.0",
    author="Saurav Sapkota",
    author_email="saurav@work.com",
    package_dir={"": "."},
    packages=find_packages(where="."),
    install_requires=[]
)
