describe("ST7036 low-level driver", function() {
  it("throws if we're not on a Raspberry Pi", function() {
    var lcd = function() {
      require("../lib/common/st7036");
    }
    expect(lcd).toThrow();
  });
});
