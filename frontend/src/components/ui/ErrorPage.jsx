const ErrorPage = ({ error }) => {
    return (
        <section className="relative z-10 flex min-h-screen items-center overflow-hidden py-20 dark:bg-dark lg:py-[120px] bg-violet-300">
            <div className="container mx-auto max-w-6xl">
                <div className="-mx-4 flex flex-wrap px-8">
                    <div className="w-full px-4 lg:w-1/2">
                        <div className="mb-12 w-full max-w-[470px] lg:mb-0">
                            <h2 className="mb-6 text-[40px] font-bold uppercase text-[#6A29DA] sm:text-[54px]">
                                404 Error
                            </h2>
                            <h3 className="mb-3 text-2xl font-semibold text-dark dark:text-white sm:text-3xl">
                                Oops! Our pipeline sprung a leak. We'll patch it up soon!
                            </h3>
                            <p className="mb-12 text-lg text-body-color dark:text-dark-6">
                                We can't seem to find the page you're looking for,
                                contact us for more information.
                            </p>
                        <a
                            className="bg-[#6A29DA] hover:bg-[#793EDE] cds--btn text-white"
                            href="https://zetane.com/contact-us"
                            target="_blank"
                        >
                            Contact Us
                        </a>
                        </div>
                </div>
                <div className="w-full px-4 lg:w-1/2 flex items-center">
                    <div className="mx-auto text-center">
                    <img
                        src="https://cdn.tailgrids.com/2.0/image/application/images/404/image-08.svg"
                        alt="404 image"
                        className="mx-auto max-w-full"
                    />
                    </div>
                </div>
                </div>
            </div>
            <div className="absolute left-0 top-0 -z-10 block h-full w-full bg-gray dark:bg-dark-2 lg:w-1/2"></div>
        </section>
  );
};

export default ErrorPage;