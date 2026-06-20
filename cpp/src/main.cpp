#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    if (argc > 1 && std::string(argv[1]) == "--version") {
        std::cout << "GeoRoute v0.1" << std::endl;
        return 0;
    }
    std::cout << "GeoRoute CLI" << std::endl;
    return 0;
}
